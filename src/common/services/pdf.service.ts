import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as Handlebars from "handlebars";
import * as path from "path";
import * as puppeteer from "puppeteer";

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor() {
    // Enregistrer les helpers Handlebars une seule fois.
    Handlebars.registerHelper("formatXOF", (value: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XOF",
      }).format(value),
    );
  }
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
      // En production (Docker Alpine) on pointe sur le Chromium système via
      // PUPPETEER_EXECUTABLE_PATH ; en local, undefined → Chromium de Puppeteer.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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

      // Charger le contenu HTML. On n'attend pas l'inactivité réseau
      // (networkidle0) pour éviter tout blocage si le CDN de polices est
      // injoignable dans le conteneur ; un timeout borne le rendu.
      await page.setContent(html, {
        waitUntil: "load",
        timeout: 15000,
      });

      // Attendre que les polices soient chargées (best-effort)
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
    } catch (error) {
      this.logger.error(
        `Échec de la génération du PDF: ${error?.message || error}`,
        error?.stack,
      );
      throw new InternalServerErrorException(
        `Le devis ne peut être généré : ${error?.message || "erreur inconnue"}`,
      );
    } finally {
      await browser.close();
    }
  }

  /**
   * Génère un PDF de devis (qui tient lieu de contrat). Tarification globale :
   * un montant total négocié + une remise, les lignes ne portent que
   * description + quantité. `includeSignature` ajoute la page de signature
   * (version backoffice pour signature en présentiel) ; la version cliente est
   * générée sans cette page.
   */
  async generateQuotePdf(quoteData: {
    number: string;
    date: string;
    eventTypeLabel: string;
    eventPeriod: string;
    attendees: number;
    client: {
      name: string;
      phone?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
    }>;
    subtotal: number;
    discountAmount: number;
    discountReason?: string;
    total: number;
    cautionAmount: number;
    includeSignature: boolean;
  }): Promise<Buffer> {
    const html = this.renderTemplate("pdf/quote", {
      ...quoteData,
      hasDiscount: quoteData.discountAmount > 0,
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
    const template = Handlebars.compile(source);
    return template(data);
  }
}
