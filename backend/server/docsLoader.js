const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "docs");

function chunkText(text, chunkSize = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function loadDocs() {
  const files = fs.readdirSync(DOCS_DIR);

  const docs = [];

  files.forEach((file) => {
    const content = fs.readFileSync(
      path.join(DOCS_DIR, file),
      "utf-8"
    );

    const chunks = chunkText(content);

    chunks.forEach((chunk, i) => {
      docs.push({
        id: `${file}-${i}`,
        file,
        text: chunk
      });
    });
  });

  return docs;
}

module.exports = { loadDocs };
