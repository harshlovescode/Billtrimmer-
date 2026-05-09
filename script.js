const importantKeywords = [
  "Amount Payable",
  "Taxable Amount",
  "Total ₹",
  "Amount Chargeable",
];

const skipKeywords = [
  "Page 2 / 2",
  "Authorized Signatory",
];

let finalRange = "";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

function createRange(arr) {

  if (!arr.length) return "";

  let ranges = [];

  let start = arr[0];
  let end = arr[0];

  for (let i = 1; i < arr.length; i++) {

    if (arr[i] === end + 1) {
      end = arr[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = arr[i];
    }
  }

  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(",");
}

async function processPDF() {

  const fileInput =
    document.getElementById("pdfInput");

  if (!fileInput.files.length) {
    alert("Upload PDF");
    return;
  }

  document.getElementById("loading")
    .innerText = "Processing PDF...";

  const file = fileInput.files[0];

  const arrayBuffer = await file.arrayBuffer();

  const pdf =
    await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

  const keepPages = [];

  for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);

    const textContent =
      await page.getTextContent();

    const text = textContent.items
      .map(item => item.str)
      .join(" ");

    const hasImportant =
      importantKeywords.some(k =>
        text.includes(k)
      );

    const hasSkip =
      skipKeywords.some(k =>
        text.includes(k)
      );

    if (hasImportant && !hasSkip) {
      keepPages.push(i);
    }
  }

  finalRange = createRange(keepPages);

  document.getElementById("results")
    .classList.remove("hidden");

  document.getElementById("pages")
    .innerText =
    `Pages Selected: ${keepPages.length}`;

  document.getElementById("saved")
    .innerText =
    `Saved ${pdf.numPages - keepPages.length} pages`;

  document.getElementById("rangeBox")
    .innerText = finalRange;

  document.getElementById("loading")
    .innerText = "";

  await createOptimizedPDF(
    arrayBuffer,
    keepPages
  );
}

function copyRange() {

  navigator.clipboard.writeText(finalRange);

  alert("Copied!");
}

async function createOptimizedPDF(
  arrayBuffer,
  keepPages
) {

  const existingPdf =
    await PDFLib.PDFDocument.load(arrayBuffer);

  const newPdf =
    await PDFLib.PDFDocument.create();

  for (const pageNum of keepPages) {

    const [copiedPage] =
      await newPdf.copyPages(
        existingPdf,
        [pageNum - 1]
      );

    newPdf.addPage(copiedPage);
  }

  const pdfBytes =
    await newPdf.save();

  const blob = new Blob(
    [pdfBytes],
    { type: "application/pdf" }
  );

  const url =
    URL.createObjectURL(blob);

  const downloadBtn =
    document.getElementById("downloadBtn");

  downloadBtn.href = url;

  downloadBtn.download =
    "optimized-invoices.pdf";
}

window.processPDF = processPDF;
window.copyRange = copyRange;
