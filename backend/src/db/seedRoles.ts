import { db } from './index';
import { sql } from 'kysely';

async function seedRoles() {
    console.log('Seeding roles...');
    try {
        const roles = [
            { name: 'admin', description: 'System administrator' },
            { name: 'organizer', description: 'Event organizer' },
            { name: 'judge', description: 'Competition judge' },
            { name: 'participant', description: 'Hackathon participant' },
        ];

        await db.insertInto('role').values(roles).orIgnore().execute();
        console.log('Roles seeded successfully.');
    } catch (error) {
        console.error('Error seeding roles:', error);
    } finally {
        await db.destroy();
    }
}

seedRoles();
