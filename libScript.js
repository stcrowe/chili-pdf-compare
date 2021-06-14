const StreamZip = require("node-stream-zip");
const axios = require("axios");
const fs = require("fs-extra");

(async () => {
    fs.emptydirSync("./lib");
    fs.emptydirSync("./temp_lib/");

    try {
        const response = await axios.get(
            "https://github.com/vslavik/diff-pdf/releases/download/v0.5/diff-pdf-win-0.5.zip",
            {
                responseType: "stream",
            }
        );

        const writeStream = fs.createWriteStream("./temp_lib/diff-pdf.zip");

        response.data.pipe(writeStream);

        await new Promise((result) => {
            writeStream.on("finish", () => {
                writeStream.close();
                result(true);
            });
            writeStream.on("error", result);
        });

        const zip = new StreamZip.async({ file: "./temp_lib/diff-pdf.zip" });

        await zip.extract(null, "./lib");

        fs.removeSync("./temp_lib/");
    } catch (e) {
        console.log(e);
    }
})();
