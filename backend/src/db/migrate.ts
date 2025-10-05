import { db } from './index';
import { sql } from 'kysely';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  console.log('Starting database migration...');

  try {
    const filePath = path.join(__dirname, '../../../../docs/database-design.md');
    const markdown = fs.readFileSync(filePath, 'utf-8');

    const sqlBlocks = markdown.match(/```sql\n([\s\S]*?)```/g);

    if (!sqlBlocks) {
      console.error('No SQL blocks found in the markdown file.');
      return;
    }

    // Combine all DDL snippets into one script
    const ddlSnippets = sqlBlocks.slice(3).join('\n').replace(/```sql\n|```/g, '');
    const triggersAndProcedures = sqlBlocks.slice(0, 3).join('\n').replace(/```sql\n|```/g, '');


    await db.transaction().execute(async (trx) => {
      // Execute DDL statements
      const ddlStatements = ddlSnippets
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of ddlStatements) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        await sql.raw(statement).execute(trx);
      }

      // Execute triggers and stored procedures
      const complexStatements = triggersAndProcedures
        .split('DELIMITER ;')
        .map(s => s.replace(/DELIMITER \$\$/g, '').trim())
        .filter(s => s.length > 0);

      for (const statement of complexStatements) {
        console.log(`Executing trigger/procedure: ${statement.substring(0, 100)}...`);
        await sql.raw(statement).execute(trx);
      }
    });

    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Error during database migration:', error);
  } finally {
    await db.destroy();
  }
}

migrate();
