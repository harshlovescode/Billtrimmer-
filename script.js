const importantKeywords = [
  "Invoice",
  "GST",
  "Tax",
  "Amount",
  "Qty",
  "Rate",
  "HSN",
  "CGST",
  "SGST",
  "IGST",
  "Total",
  "Taxable",
  "Description",
];

const badKeywords = [
  "Bank Details",
  "Declaration",
  "Terms & Conditions",
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

    const lowerText = text.toLowerCase();

    const textLength = text.length;

    let score = 0;

    importantKeywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    badKeywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score -= 1;
      }
    });

    // MAIN LOGIC

    const keep =
      (
        score >= 3
        || textLength > 1500
      );

    if (keep) {
      keepPages.push(i);
    }

    console.log({
      page: i,
      score,
      textLength,
      keep
    });
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
