import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from 'node-fetch';
import { json2csv } from "json-2-csv";
import * as fs from 'fs';
import { ILead, IPage } from "./models";
import { sleep } from "./utils";

//https://www.manta.com/more-results/41_ALL_41?pg=2
const commandLineArgs = require('command-line-args');
const commandOptions = commandLineArgs([
     {name: "pages", alias: "p", type: Number},
]);
const csvFileName = `${__dirname}/leads-${new Date().getTime()}.csv`;

const unblockerUsername = "akhileshsharma";
const unblockerPassword = "AKHILesh17";
const agent = new HttpsProxyAgent(
    `http://${unblockerUsername}:${unblockerPassword}@unblock.oxylabs.io:60000
`); 

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

async function run() {
   const maxPages = commandOptions.pages || 5;
   console.log(` 🟢 Job started. pages to fetch:${maxPages}`);

   try{
    for(let currentPage = 1; currentPage <= maxPages; currentPage++)
    {
        console.log(`Fetching page: ${currentPage} of ${maxPages}`);

        const response = await fetch(
            `https://www.manta.com/more-results/41_ALL_41?pg=${currentPage}`,
            {
                method: "GET",
                agent
            }
        ).catch((error) => {
          console.log(`Error fetching page: ${currentPage}: ${error}`);
          return;
        });

        if(!response){
            throw new Error("Response is undefined");
        }

        if(!response.ok){
          throw new Error(
            `An error has occurred when fetching. Status code: ${response.status}. Message: ${response.statusText}`
            );
        }

        let textResponse = (await response.text()).replace(/\\n/g, "");
        const jsonPage: IPage = JSON.parse(textResponse);
        const { companies } = jsonPage;

        const leads : ILead[] = companies.list.map((company) => {
            const { name, contactInfo } = company;
            const { phone } = contactInfo;
            return { comapnyName: name, phone };
        })
        .filter((Lead) => Lead.phone !== undefined);

        console.log(`🟢 Fetched ${leads.length} leads`);
        console.log(`Converting to CSV...`);

        const csv = await json2csv(leads, { prependHeader: false });

        console.log("Generating CSV file...");
        fs.writeFileSync(csvFileName, csv + "\n", { flag: "a" });

        console.log(`✅ Wrote to CSV file: ${csvFileName}\n`);

        await sleep(10);
    }
   } catch(error){
      console.log(`🔴 An error has occurred: ${error}`);
   }
   
}

run();