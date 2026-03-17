import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as Handlebars from "handlebars";
import * as path from "path";
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
    },
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
    const html = this.renderTemplate("pdf/quote", {
      ...quoteData,
      vatAmount: quoteData.totalTTC - quoteData.totalHT,
    });
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

  async generateContractPdf(data: {
    folderNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    eventType: string;
    attendees: number;
    schedules: string;
    totalTTC: number;
    depositAmount: number;
    cautionAmount: number;
    date: string;
  }): Promise<Buffer> {
    const html = this.renderTemplate("pdf/contract", data);
    return this.generatePdf(html, {
      format: "A4",
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });
  }

  /**
   * Compile et rend un template Handlebars depuis src/mail/templates/
   */
  private renderTemplate(name: string, data: Record<string, any>): string {
    const templatePath = path.join(
      __dirname,
      "../../mail/templates",
      `${name}.hbs`,
    );
    const source = fs.readFileSync(templatePath, "utf-8");
    Handlebars.registerHelper("formatXOF", (value: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XOF",
      }).format(value),
    );
    const template = Handlebars.compile(source);
    return template(data);
  }
}
