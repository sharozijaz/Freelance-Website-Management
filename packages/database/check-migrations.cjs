const postgres = require("postgres");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const migrations = [
  "0005_exotic_captain_stacy.sql",
  "0006_classy_angel.sql",
  "0007_curved_frog_thor.sql",
  "0008_parched_franklin_richards.sql",
];

async function main() {
  try {
    await sql.begin(async (tx) => {
      for (const file of migrations) {
        console.log(`\n========================================`);
        console.log(`TESTING MIGRATION: ${file}`);
        console.log(`========================================`);

        const migration = fs.readFileSync(`./drizzle/${file}`, "utf8");

        const statements = migration
          .split("--> statement-breakpoint")
          .map((statement) => statement.trim())
          .filter(Boolean);

        for (let index = 0; index < statements.length; index++) {
          console.log(`Testing ${file} statement ${index + 1}/${statements.length}`);

          try {
            await tx.unsafe(statements[index]);
            console.log("PASSED");
          } catch (error) {
            console.error("\nFAILED MIGRATION:");
            console.error(file);
            console.error("\nFAILED STATEMENT:");
            console.error(statements[index]);
            console.error("\nPOSTGRES ERROR:");
            console.error(error);
            throw error;
          }
        }
      }

      throw new Error("DIAGNOSTIC_ROLLBACK");
    });
  } catch (error) {
    if (error.message === "DIAGNOSTIC_ROLLBACK") {
      console.log("\nAll pending migrations passed.");
      console.log("Transaction rolled back intentionally.");
    } else {
      console.error(error);
      await sql.end();
      process.exit(1);
    }
  }

  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
