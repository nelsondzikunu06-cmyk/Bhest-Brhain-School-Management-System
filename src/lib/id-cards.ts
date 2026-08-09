import QRCode from "qrcode";

export type IdCardPerson = {
  code: string;
  name: string;
  subtitle: string;
  meta?: string;
  photoUrl?: string | null;
  kind: "student" | "staff";
};

export const SCHOOL_NAME = "Bhest Brhain Academy";

/** Payload encoded into the QR. Kept short so low-res cameras still read it. */
export function qrPayload(kind: "student" | "staff", code: string) {
  return `BBA|${kind === "student" ? "S" : "T"}|${code}`;
}

export function parseQrPayload(raw: string): { kind: "student" | "staff"; code: string } | null {
  const parts = raw.trim().split("|");
  if (parts.length !== 3 || parts[0] !== "BBA") return null;
  if (parts[1] !== "S" && parts[1] !== "T") return null;
  return { kind: parts[1] === "S" ? "student" : "staff", code: parts[2] };
}

export async function qrDataUrl(text: string, size = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b2545", light: "#ffffff" },
  });
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Renders a printable A4 sheet of ID cards (2 columns x 5 rows). */
export async function generateIdCardsPdf(people: IdCardPerson[], year: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const CARD_W = 86;
  const CARD_H = 54;
  const GAP_X = 8;
  const GAP_Y = 6;
  const MARGIN_X = 15;
  const MARGIN_Y = 15;
  const PER_ROW = 2;
  const PER_COL = 5;
  const PER_PAGE = PER_ROW * PER_COL;

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const idx = i % PER_PAGE;
    if (i > 0 && idx === 0) doc.addPage();

    const col = idx % PER_ROW;
    const row = Math.floor(idx / PER_ROW);
    const x = MARGIN_X + col * (CARD_W + GAP_X);
    const y = MARGIN_Y + row * (CARD_H + GAP_Y);

    // Card body
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 205, 215);
    doc.roundedRect(x, y, CARD_W, CARD_H, 2.5, 2.5, "FD");

    // Navy header band
    doc.setFillColor(11, 37, 69);
    doc.roundedRect(x, y, CARD_W, 12, 2.5, 2.5, "F");
    doc.rect(x, y + 8, CARD_W, 4, "F");

    // Gold accent
    doc.setFillColor(198, 160, 58);
    doc.rect(x, y + 12, CARD_W, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(SCHOOL_NAME.toUpperCase(), x + 4, y + 6.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(p.kind === "student" ? "STUDENT IDENTITY CARD" : "STAFF IDENTITY CARD", x + 4, y + 10);

    // Photo
    const photoX = x + 4;
    const photoY = y + 17;
    const photoW = 20;
    const photoH = 24;
    doc.setDrawColor(220, 224, 232);
    doc.setFillColor(241, 243, 247);
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, "FD");
    if (p.photoUrl) {
      const dataUrl = await toDataUrl(p.photoUrl);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, photoX, photoY, photoW, photoH);
        } catch {
          /* unsupported image, keep placeholder */
        }
      }
    }

    // Details
    const tx = photoX + photoW + 4;
    doc.setTextColor(11, 37, 69);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(doc.splitTextToSize(p.name, 36), tx, y + 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 88, 102);
    doc.text(p.subtitle, tx, y + 29);
    if (p.meta) doc.text(p.meta, tx, y + 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(11, 37, 69);
    doc.text(p.code, tx, y + 39);

    // QR
    const qr = await qrDataUrl(qrPayload(p.kind, p.code), 240);
    doc.addImage(qr, x + CARD_W - 21, y + 17, 17, 17);

    doc.setFontSize(5.5);
    doc.setTextColor(120, 126, 138);
    doc.text(`Valid ${year}`, x + CARD_W - 21, y + 37);
    doc.text("Scan at the school gate for check-in / check-out.", x + 4, y + 48);
  }

  doc.save(`bba-id-cards-${year}.pdf`);
}
