import { Injectable } from "@nestjs/common";
import * as puppeteer from "puppeteer";

@Injectable()
export class PdfService {
  /**
   * Génère un PDF à partir d'un contenu HTML
   * @param html Le contenu HTML à convertir
   * @param options Options de configuration du PDF
   * @returns Buffer contenant le PDF
   */
  async generatePdf(
    html: string,
    options?: {
      format?: "A4" | "Letter";
      landscape?: boolean;
      margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
    }
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    try {
      const page = await browser.newPage();

      // Configurer le viewport pour un rendu cohérent
      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
        deviceScaleFactor: 2, // Haute résolution
      });

      // Charger le contenu HTML
      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      // Attendre que les polices soient chargées
      await page.evaluateHandle("document.fonts.ready");

      // Générer le PDF
      const pdfBuffer = await page.pdf({
        format: options?.format || "A4",
        landscape: options?.landscape || false,
        printBackground: true, // Important pour les backgrounds colorés
        margin: options?.margin || {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        displayHeaderFooter: false,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Génère un PDF de devis avec le template de luxe
   * @param quoteData Données du devis
   * @returns Buffer contenant le PDF
   */
  async generateQuotePdf(quoteData: {
    number: string;
    date: string;
    validUntil: string;
    client: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    totalHT: number;
    vatRate: number;
    totalTTC: number;
    notes?: string;
  }): Promise<Buffer> {
    const html = this.generateQuoteHtml(quoteData);
    return this.generatePdf(html, {
      format: "A4",
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });
  }

  /**
   * Génère le HTML du template de devis luxury
   */
  private generateQuoteHtml(data: {
    number: string;
    date: string;
    validUntil: string;
    client: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    totalHT: number;
    vatRate: number;
    totalTTC: number;
    notes?: string;
  }): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(amount);

    const vatAmount = data.totalTTC - data.totalHT;

    const itemsHtml = data.items
      .map(
        (item) => `
      <tr>
        <td class="description">${item.description}</td>
        <td class="quantity">${item.quantity}</td>
        <td class="unit-price">${formatCurrency(item.unitPrice)}</td>
        <td class="total-price">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `
      )
      .join("");

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${data.number} - Pavillon Les Lys</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #0a0a0a;
      color: #f5f5f5;
      line-height: 1.6;
      font-size: 12px;
    }
    
    .container {
      max-width: 100%;
      background: linear-gradient(180deg, #0a0a0a 0%, #111111 100%);
      min-height: 100vh;
      padding: 30px;
    }
    
    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #D4AF37;
    }
    
    .company-info {
      flex: 1;
    }
    
    .logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 32px;
      font-weight: 700;
      color: #D4AF37;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    
    .tagline {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }
    
    .company-details {
      font-size: 11px;
      color: #aaa;
      line-height: 1.8;
    }
    
    .quote-badge {
      background: linear-gradient(135deg, #D4AF37 0%, #B5952F 100%);
      color: #0a0a0a;
      padding: 15px 30px;
      border-radius: 8px;
      text-align: center;
    }
    
    .quote-badge h2 {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    
    .quote-number {
      font-size: 14px;
      font-weight: 600;
    }
    
    /* Info Section */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 35px;
      gap: 30px;
    }
    
    .info-box {
      flex: 1;
      background-color: #151515;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 20px;
    }
    
    .info-box h3 {
      color: #D4AF37;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #2a2a2a;
    }
    
    .info-box p {
      color: #ccc;
      margin-bottom: 6px;
      font-size: 12px;
    }
    
    .info-box .highlight {
      color: #fff;
      font-weight: 500;
    }
    
    /* Items Table */
    .items-section {
      margin-bottom: 30px;
    }
    
    .items-section h3 {
      color: #D4AF37;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background-color: #151515;
      border-radius: 8px;
      overflow: hidden;
    }
    
    thead {
      background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
    }
    
    th {
      color: #D4AF37;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #D4AF37;
    }
    
    th:last-child {
      text-align: right;
    }
    
    td {
      padding: 15px;
      color: #ddd;
      border-bottom: 1px solid #2a2a2a;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .description {
      width: 50%;
    }
    
    .quantity, .unit-price {
      text-align: center;
    }
    
    .total-price {
      text-align: right;
      font-weight: 500;
      color: #fff;
    }
    
    /* Totals Section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .totals-box {
      width: 300px;
      background-color: #151515;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 20px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      color: #aaa;
      font-size: 13px;
    }
    
    .total-row.subtotal {
      border-bottom: 1px solid #2a2a2a;
    }
    
    .total-row.vat {
      color: #888;
      font-size: 12px;
    }
    
    .total-row.grand-total {
      border-top: 2px solid #D4AF37;
      margin-top: 10px;
      padding-top: 15px;
      color: #D4AF37;
      font-size: 18px;
      font-weight: 700;
    }
    
    .total-row span:last-child {
      color: #fff;
    }
    
    .total-row.grand-total span:last-child {
      color: #D4AF37;
    }
    
    /* Notes Section */
    .notes-section {
      background-color: #151515;
      border: 1px solid #2a2a2a;
      border-left: 4px solid #D4AF37;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .notes-section h3 {
      color: #D4AF37;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    
    .notes-section p {
      color: #aaa;
      font-size: 12px;
      line-height: 1.8;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 25px;
      border-top: 1px solid #2a2a2a;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .validity {
      color: #888;
      font-size: 11px;
    }
    
    .validity strong {
      color: #D4AF37;
    }
    
    .signature-box {
      width: 200px;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #444;
      padding-top: 10px;
      color: #666;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Legal Footer */
    .legal-footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #1a1a1a;
      text-align: center;
      color: #555;
      font-size: 9px;
      line-height: 1.8;
    }
    
    .legal-footer .brand {
      color: #D4AF37;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="logo">Pavillon Les Lys</div>
        <div class="tagline">Espace événementiel de prestige</div>
        <div class="company-details">
          123 Avenue des Champs-Élysées<br>
          75008 Paris, France<br>
          Tél: +33 1 23 45 67 89<br>
          contact@pavillonleslys.fr
        </div>
      </div>
      <div class="quote-badge">
        <h2>Devis</h2>
        <div class="quote-number">${data.number}</div>
      </div>
    </div>
    
    <!-- Info Section -->
    <div class="info-section">
      <div class="info-box">
        <h3>Informations client</h3>
        <p class="highlight">${data.client.name}</p>
        ${data.client.email ? `<p>${data.client.email}</p>` : ""}
        ${data.client.phone ? `<p>${data.client.phone}</p>` : ""}
        ${data.client.address ? `<p>${data.client.address}</p>` : ""}
      </div>
      <div class="info-box">
        <h3>Détails du devis</h3>
        <p><span class="highlight">Date d'émission:</span> ${data.date}</p>
        <p><span class="highlight">Validité:</span> ${data.validUntil}</p>
        <p><span class="highlight">Référence:</span> ${data.number}</p>
      </div>
    </div>
    
    <!-- Items Table -->
    <div class="items-section">
      <h3>Détail des prestations</h3>
      <table>
        <thead>
          <tr>
            <th class="description">Description</th>
            <th class="quantity">Qté</th>
            <th class="unit-price">Prix unitaire</th>
            <th class="total-price">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row subtotal">
          <span>Total HT</span>
          <span>${formatCurrency(data.totalHT)}</span>
        </div>
        <div class="total-row vat">
          <span>TVA (${data.vatRate}%)</span>
          <span>${formatCurrency(vatAmount)}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total TTC</span>
          <span>${formatCurrency(data.totalTTC)}</span>
        </div>
      </div>
    </div>
    
    ${
      data.notes
        ? `
    <!-- Notes -->
    <div class="notes-section">
      <h3>Notes & Conditions</h3>
      <p>${data.notes}</p>
    </div>
    `
        : ""
    }
    
    <!-- Footer -->
    <div class="footer">
      <div class="validity">
        Ce devis est valable jusqu'au <strong>${data.validUntil}</strong>.<br>
        Un acompte de 30% sera demandé à la signature.
      </div>
      <div class="signature-box">
        <div style="height: 60px;"></div>
        <div class="signature-line">Signature client</div>
      </div>
    </div>
    
    <!-- Legal Footer -->
    <div class="legal-footer">
      <span class="brand">Pavillon Les Lys</span> — SIRET: 123 456 789 00012 — TVA: FR12 345 678 901<br>
      Capital social: 50 000 € — RCS Paris B 123 456 789
    </div>
  </div>
</body>
</html>
    `;
  }
}
