export interface TemporaryReportTest {
  readonly name: string;
  readonly status: string;
}

export interface TemporaryReportDocument {
  readonly title: string;
  readonly customer: string;
  readonly tractorPlate: string;
  readonly trailerPlate: string;
  readonly technician: string;
  readonly createdAt: string;
  readonly diagnosis: string;
  readonly fee: string;
  readonly tests: readonly TemporaryReportTest[];
  readonly labels: {
    readonly customer: string;
    readonly tractor: string;
    readonly trailer: string;
    readonly technician: string;
    readonly date: string;
    readonly diagnosis: string;
    readonly fee: string;
    readonly testResults: string;
  };
}

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PDF_WIDTH = 595;
const PDF_HEIGHT = 842;

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let line = words[0] ?? '';
    for (let index = 1; index < words.length; index += 1) {
      const candidate = line + ' ' + words[index];
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = words[index];
      }
    }
    lines.push(line);
  }

  return lines;
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapText(context, text, maxWidth);
  for (const line of lines) {
    context.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawLabelValue(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
): void {
  context.fillStyle = '#737985';
  context.font = '600 22px Arial, sans-serif';
  context.fillText(label.toUpperCase(), x, y);
  context.fillStyle = '#111318';
  context.font = '700 29px Arial, sans-serif';
  const lines = wrapText(context, value || '—', width);
  context.fillText(lines[0] ?? '—', x, y + 38);
}

function drawBasePage(
  context: CanvasRenderingContext2D,
  document: TemporaryReportDocument,
  pageNumber: number,
): number {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  context.fillStyle = '#111318';
  context.font = '700 52px Arial, sans-serif';
  context.fillText('Bremsecu', 92, 106);
  context.fillStyle = '#737985';
  context.font = '500 20px Arial, sans-serif';
  context.fillText('Intelligent Truck Technology', 94, 138);

  context.fillStyle = '#DA130D';
  context.fillRect(92, 176, 1056, 5);

  context.fillStyle = '#111318';
  context.font = '700 42px Arial, sans-serif';
  context.fillText(document.title, 92, 245);

  context.fillStyle = '#737985';
  context.font = '500 19px Arial, sans-serif';
  context.fillText('Bremsecu G1 · ' + pageNumber, 1015, 108);

  return 300;
}

function drawFirstPage(
  context: CanvasRenderingContext2D,
  document: TemporaryReportDocument,
  tests: readonly TemporaryReportTest[],
): void {
  let y = drawBasePage(context, document, 1);

  context.fillStyle = '#F6F7F9';
  context.strokeStyle = '#D5D8DE';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(92, y, 1056, 215, 22);
  context.fill();
  context.stroke();

  drawLabelValue(context, document.labels.customer, document.customer, 126, y + 48, 500);
  drawLabelValue(context, document.labels.tractor, document.tractorPlate, 126, y + 130, 300);
  drawLabelValue(context, document.labels.trailer, document.trailerPlate, 480, y + 130, 300);
  drawLabelValue(context, document.labels.technician, document.technician, 815, y + 48, 280);
  drawLabelValue(context, document.labels.date, document.createdAt, 815, y + 130, 280);

  y += 270;
  context.fillStyle = '#111318';
  context.font = '700 29px Arial, sans-serif';
  context.fillText(document.labels.testResults, 92, y);
  y += 38;

  for (const test of tests) {
    context.fillStyle = '#F8F9FA';
    context.strokeStyle = '#E0E2E6';
    context.beginPath();
    context.roundRect(92, y, 1056, 68, 14);
    context.fill();
    context.stroke();

    context.fillStyle = '#111318';
    context.font = '600 23px Arial, sans-serif';
    context.fillText(test.name, 118, y + 43);
    context.textAlign = 'right';
    context.fillStyle = '#535A65';
    context.font = '700 19px Arial, sans-serif';
    context.fillText(test.status, 1120, y + 42);
    context.textAlign = 'left';
    y += 82;
  }

  y += 18;
  context.fillStyle = '#111318';
  context.font = '700 29px Arial, sans-serif';
  context.fillText(document.labels.diagnosis, 92, y);
  y += 40;

  context.fillStyle = '#F8F9FA';
  context.strokeStyle = '#E0E2E6';
  context.beginPath();
  context.roundRect(92, y, 1056, 230, 16);
  context.fill();
  context.stroke();

  context.fillStyle = '#2D3138';
  context.font = '500 22px Arial, sans-serif';
  drawTextBlock(context, document.diagnosis || '—', 120, y + 42, 1000, 32);

  y += 275;
  context.fillStyle = '#737985';
  context.font = '600 21px Arial, sans-serif';
  context.fillText(document.labels.fee.toUpperCase(), 92, y);
  context.fillStyle = '#111318';
  context.font = '700 34px Arial, sans-serif';
  context.fillText((document.fee || '0,00') + ' ₺', 92, y + 46);
}

function drawContinuationPage(
  context: CanvasRenderingContext2D,
  document: TemporaryReportDocument,
  tests: readonly TemporaryReportTest[],
  pageNumber: number,
): void {
  let y = drawBasePage(context, document, pageNumber);
  context.fillStyle = '#111318';
  context.font = '700 29px Arial, sans-serif';
  context.fillText(document.labels.testResults, 92, y);
  y += 42;

  for (const test of tests) {
    context.fillStyle = '#F8F9FA';
    context.strokeStyle = '#E0E2E6';
    context.beginPath();
    context.roundRect(92, y, 1056, 72, 14);
    context.fill();
    context.stroke();
    context.fillStyle = '#111318';
    context.font = '600 23px Arial, sans-serif';
    context.fillText(test.name, 118, y + 45);
    context.textAlign = 'right';
    context.fillStyle = '#535A65';
    context.font = '700 19px Arial, sans-serif';
    context.fillText(test.status, 1120, y + 44);
    context.textAlign = 'left';
    y += 86;
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('PDF_PAGE_RENDER_FAILED'));
    }, 'image/jpeg', 0.9);
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function renderPages(document: TemporaryReportDocument): Promise<Uint8Array[]> {
  const firstPageCapacity = 7;
  const continuationCapacity = 15;
  const pageGroups: TemporaryReportTest[][] = [];

  pageGroups.push(document.tests.slice(0, firstPageCapacity));
  for (let index = firstPageCapacity; index < document.tests.length; index += continuationCapacity) {
    pageGroups.push(document.tests.slice(index, index + continuationCapacity));
  }

  const pages: Uint8Array[] = [];
  for (let index = 0; index < pageGroups.length; index += 1) {
    const canvas = window.document.createElement('canvas');
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF_CANVAS_UNAVAILABLE');

    const group = pageGroups[index] ?? [];
    if (index === 0) drawFirstPage(context, document, group);
    else drawContinuationPage(context, document, group, index + 1);

    pages.push(await canvasToJpeg(canvas));
  }

  return pages;
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function buildPdf(jpegs: readonly Uint8Array[]): Uint8Array {
  const objectCount = 2 + jpegs.length * 3;
  const objects = new Map<number, Uint8Array>();

  const pageRefs = jpegs.map((_, index) => 3 + index * 3);
  objects.set(1, ascii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
  objects.set(
    2,
    ascii(
      '2 0 obj\n<< /Type /Pages /Count ' +
      jpegs.length +
      ' /Kids [' +
      pageRefs.map((num) => num + ' 0 R').join(' ') +
      '] >>\nendobj\n',
    ),
  );

  jpegs.forEach((jpeg, index) => {
    const pageNum = 3 + index * 3;
    const imageNum = pageNum + 1;
    const contentNum = pageNum + 2;
    const page =
      pageNum +
      ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
      PDF_WIDTH +
      ' ' +
      PDF_HEIGHT +
      '] /Resources << /XObject << /Im0 ' +
      imageNum +
      ' 0 R >> >> /Contents ' +
      contentNum +
      ' 0 R >>\nendobj\n';
    objects.set(pageNum, ascii(page));

    const imageHead = ascii(
      imageNum +
      ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' +
      PAGE_WIDTH +
      ' /Height ' +
      PAGE_HEIGHT +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
      jpeg.length +
      ' >>\nstream\n',
    );
    const imageTail = ascii('\nendstream\nendobj\n');
    objects.set(imageNum, concat([imageHead, jpeg, imageTail]));

    const commands =
      'q\n' + PDF_WIDTH + ' 0 0 ' + PDF_HEIGHT + ' 0 0 cm\n/Im0 Do\nQ\n';
    const commandBytes = ascii(commands);
    objects.set(
      contentNum,
      concat([
        ascii(contentNum + ' 0 obj\n<< /Length ' + commandBytes.length + ' >>\nstream\n'),
        commandBytes,
        ascii('endstream\nendobj\n'),
      ]),
    );
  });

  const header = concat([
    ascii('%PDF-1.4\n%'),
    new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]),
    ascii('\n'),
  ]);

  const bodyChunks: Uint8Array[] = [header];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let length = header.length;

  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    const object = objects.get(objectNumber);
    if (!object) throw new Error('PDF_OBJECT_MISSING');
    offsets[objectNumber] = length;
    bodyChunks.push(object);
    length += object.length;
  }

  const xrefOffset = length;
  let xref = 'xref\n0 ' + (objectCount + 1) + '\n';
  xref += '0000000000 65535 f \n';
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    xref += String(offsets[objectNumber]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer =
    'trailer\n<< /Size ' +
    (objectCount + 1) +
    ' /Root 1 0 R >>\nstartxref\n' +
    xrefOffset +
    '\n%%EOF';

  bodyChunks.push(ascii(xref + trailer));
  return concat(bodyChunks);
}

function safeFileToken(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'report';
}

export async function shareTemporaryReportPdf(document: TemporaryReportDocument): Promise<void> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('PDF_BROWSER_REQUIRED');
  }

  const jpegs = await renderPages(document);
  const pdf = buildPdf(jpegs);
  const date = new Date().toISOString().slice(0, 10);
  const filename =
    'Bremsecu-' +
    safeFileToken(document.tractorPlate !== '—' ? document.tractorPlate : document.customer) +
    '-' +
    date +
    '.pdf';
  const pdfCopy = new Uint8Array(pdf.length);
  pdfCopy.set(pdf);
  const file = new File([pdfCopy.buffer], filename, { type: 'application/pdf' });

  const sharePayload: ShareData = {
    title: document.title,
    files: [file],
  };

  if (typeof navigator.share === 'function') {
    const canShareFiles =
      typeof navigator.canShare !== 'function' ||
      navigator.canShare(sharePayload);
    if (canShareFiles) {
      await navigator.share(sharePayload);
      return;
    }
  }

  const url = URL.createObjectURL(file);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    URL.revokeObjectURL(url);
    throw new Error('PDF_SHARE_UNAVAILABLE');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
