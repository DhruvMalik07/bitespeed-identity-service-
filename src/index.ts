import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface ContactResponse {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

app.post('/identify', async (req, res) => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: 'Either email or phoneNumber is required' });
    }

    // 1. Find all contacts potentially linked by the request's email or phone number
    const initialMatchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : {},
          phoneNumber ? { phoneNumber } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // Ensure deterministic order
    });

    if (initialMatchingContacts.length === 0) {
      // Case 1: No existing contacts match. Create a new primary contact.
      const newContact = await prisma.contact.create({
        data: { email, phoneNumber, linkPrecedence: 'primary' },
      });
      return res.json({
        contact: {
          primaryContactId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // 2. Consolidate contacts: Determine the true primary and update others if necessary.
    const rootPrimaryContactIds = new Set<number>();
    for (const contact of initialMatchingContacts) {
      if (contact.linkPrecedence === 'primary') {
        rootPrimaryContactIds.add(contact.id);
      } else if (contact.linkedId) {
        rootPrimaryContactIds.add(contact.linkedId);
      }
    }

    let finalPrimaryContact: import('@prisma/client').Contact | undefined;

    if (rootPrimaryContactIds.size > 0) {
        const distinctRootPrimaries = await prisma.contact.findMany({
            where: { id: { in: Array.from(rootPrimaryContactIds) } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        finalPrimaryContact = distinctRootPrimaries[0]; // Oldest is the chosen one
    }
    
    // Fallback if no root primaries found but initial matches exist (e.g., only secondaries with dangling linkedIds)
    if (!finalPrimaryContact && initialMatchingContacts.length > 0) {
        finalPrimaryContact = initialMatchingContacts[0]; // Oldest initial match
        if (finalPrimaryContact.linkPrecedence !== 'primary' || finalPrimaryContact.linkedId !== null) {
            finalPrimaryContact = await prisma.contact.update({
                where: { id: finalPrimaryContact.id },
                data: { linkPrecedence: 'primary', linkedId: null },
            });
        }
    }

    if (!finalPrimaryContact) {
         console.error("Logical error: Could not determine finalPrimaryContact. Initial matches:", initialMatchingContacts);
         return res.status(500).json({ error: "Internal server error: Could not determine primary contact." });
    }

    const updatesToPerform: any[] = [];
    const idsThatWerePrimaryAndNeedDemoting = new Set<number>();

    // Identify original primary contacts that are not the finalPrimaryContact
    const originalPrimaries = await prisma.contact.findMany({
        where: { id: { in: Array.from(rootPrimaryContactIds) } },
         orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    for (const primaryToConsider of originalPrimaries) {
        if (primaryToConsider.id !== finalPrimaryContact.id) {
            idsThatWerePrimaryAndNeedDemoting.add(primaryToConsider.id);
        }
    }
    
    const mergeHappened = idsThatWerePrimaryAndNeedDemoting.size > 0;

    if (mergeHappened) {
        // Update these contacts to secondary, linked to finalPrimaryContact
        updatesToPerform.push(
            prisma.contact.updateMany({
                where: { id: { in: Array.from(idsThatWerePrimaryAndNeedDemoting) } },
                data: {
                    linkedId: finalPrimaryContact.id,
                    linkPrecedence: 'secondary',
                },
            })
        );
        // Also update any contacts that were secondary to these now-demoted primaries
        updatesToPerform.push(
            prisma.contact.updateMany({
                where: { linkedId: { in: Array.from(idsThatWerePrimaryAndNeedDemoting) } },
                data: {
                    linkedId: finalPrimaryContact.id,
                },
            })
        );
    }
    
    if (updatesToPerform.length > 0) {
      await prisma.$transaction(updatesToPerform);
    }

    // 3. Fetch all contacts now related to finalPrimaryContact
    let allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: finalPrimaryContact.id }, { linkedId: finalPrimaryContact.id }],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const isNewEmail = email && !allRelatedContacts.some(c => c.email === email);
    const isNewPhoneNumber = phoneNumber && !allRelatedContacts.some(c => c.phoneNumber === phoneNumber);
    const exactPairExists = allRelatedContacts.some(c => c.email === email && c.phoneNumber === phoneNumber);

    if (!mergeHappened && !exactPairExists && (isNewEmail || isNewPhoneNumber) && (email || phoneNumber)) {
      const newSecondaryData: any = {
        linkedId: finalPrimaryContact.id,
        linkPrecedence: 'secondary',
      };
      if (email) newSecondaryData.email = email;
      if (phoneNumber) newSecondaryData.phoneNumber = phoneNumber;

      await prisma.contact.create({ data: newSecondaryData });
      
      allRelatedContacts = await prisma.contact.findMany({
        where: {
          OR: [{ id: finalPrimaryContact.id }, { linkedId: finalPrimaryContact.id }],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    }

    // 4. Prepare and send the response
    const responseEmails = [...new Set(allRelatedContacts.map(c => c.email).filter(Boolean) as string[])].sort();
    const responsePhoneNumbers = [...new Set(allRelatedContacts.map(c => c.phoneNumber).filter(Boolean) as string[])].sort();
    const responseSecondaryIds = allRelatedContacts
      .filter(c => c.id !== finalPrimaryContact!.id)
      .map(c => c.id)
      .sort((a,b) => a - b);

    return res.json({
      contact: {
        primaryContactId: finalPrimaryContact!.id,
        emails: responseEmails,
        phoneNumbers: responsePhoneNumbers,
        secondaryContactIds: responseSecondaryIds,
      },
    });

  } catch (error) {
    console.error('Error in /identify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 