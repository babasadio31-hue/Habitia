"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccountingReportPDF = exports.generateQuittancePDF = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const addLogoToPdf = (doc, logoDataUrl, x, y, width) => {
    if (!logoDataUrl)
        return false;
    try {
        const matches = logoDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            doc.image(buffer, x, y, { width });
            return true;
        }
    }
    catch (e) {
        console.error("Error adding logo to PDF:", e);
    }
    return false;
};
const generateQuittancePDF = (res, data) => {
    const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
    // Stream PDF response directly
    doc.pipe(res);
    // Colors
    const primaryColor = '#2563EB'; // Blue
    const darkColor = '#1F2937';
    const grayColor = '#4B5563';
    const lightGrayColor = '#F3F4F6';
    // 1. Header (Enterprise Logo & Title)
    let headerX = 50;
    const logoWidth = 60;
    const hasLogo = addLogoToPdf(doc, data.enterprise.logo, 50, 45, logoWidth);
    if (hasLogo) {
        headerX = 125;
    }
    doc.fillColor(primaryColor)
        .fontSize(data.enterprise.nom.length > 25 ? 16 : 20)
        .font('Helvetica-Bold')
        .text(data.enterprise.nom, headerX, 50);
    doc.fontSize(9)
        .font('Helvetica')
        .fillColor(grayColor)
        .text(`Adresse : ${data.enterprise.adresse}`, headerX, 75)
        .text(`SIRET : ${data.enterprise.siret} | Tél : ${data.enterprise.telephone || 'N/A'}`, headerX, 88);
    doc.fillColor(primaryColor)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('QUITTANCE DE LOYER', 300, 50, { align: 'right' });
    doc.fontSize(9)
        .font('Helvetica')
        .fillColor(darkColor)
        .text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 300, 75, { align: 'right' })
        .text(`Paiement Réf : ${data.paiement.id}`, 300, 88, { align: 'right' });
    // Draw divider line
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#E5E7EB').lineWidth(1).stroke();
    // 2. Bailleur (Owner) vs Locataire (Tenant) blocks
    // Left: Owner
    doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text('BAILLEUR (Représenté par l\'agence)', 50, 140);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkColor).text(`${data.proprietaire.prenom} ${data.proprietaire.nom}`, 50, 160);
    doc.font('Helvetica').fillColor(grayColor)
        .text(data.proprietaire.adresse, 50, 175, { width: 220 })
        .text(`Tél : ${data.proprietaire.telephone}`, 50, 205)
        .text(`Email : ${data.proprietaire.email}`, 50, 220);
    // Right: Tenant
    doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text('LOCATAIRE', 320, 140);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkColor).text(`${data.locataire.prenom} ${data.locataire.nom}`, 320, 160);
    doc.font('Helvetica').fillColor(grayColor)
        .text(`Bien occupé : ${data.bien.adresse}, ${data.bien.ville}`, 320, 175, { width: 220 })
        .text(`Tél : ${data.locataire.telephone}`, 320, 205)
        .text(`Email : ${data.locataire.email}`, 320, 220);
    // Draw another divider
    doc.moveTo(50, 250).lineTo(545, 250).stroke();
    // 3. Receipt Details Table/Box
    doc.fillColor(lightGrayColor).rect(50, 270, 495, 30).fill();
    doc.fontSize(11).font('Helvetica-Bold').fillColor(darkColor)
        .text('Description', 60, 280)
        .text('Période', 260, 280)
        .text('Montant Payé (FCFA)', 420, 280, { align: 'right', width: 110 });
    doc.fontSize(10).font('Helvetica').fillColor(darkColor)
        .text(`Loyer et Charges - ${data.bien.type.toUpperCase()}`, 60, 315)
        .text(data.periode, 260, 315)
        .font('Helvetica-Bold')
        .text(data.paiement.montant.toLocaleString('fr-FR') + ' FCFA', 420, 315, { align: 'right', width: 110 });
    // Breakdown detail lines
    doc.moveTo(50, 340).lineTo(545, 340).stroke();
    const loyerPrincipal = data.contrat.montantLoyer;
    const charges = data.paiement.montant - loyerPrincipal > 0 ? data.paiement.montant - loyerPrincipal : 0;
    doc.fontSize(9).font('Helvetica').fillColor(grayColor)
        .text('Loyer Principal :', 60, 355)
        .text(loyerPrincipal.toLocaleString('fr-FR') + ' FCFA', 420, 355, { align: 'right', width: 110 })
        .text('Provisions pour charges :', 60, 370)
        .text(charges.toLocaleString('fr-FR') + ' FCFA', 420, 370, { align: 'right', width: 110 });
    // Total box
    doc.fillColor('#EFF6FF').rect(50, 395, 495, 35).fill();
    doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor)
        .text('TOTAL REÇU :', 60, 407)
        .text(data.paiement.montant.toLocaleString('fr-FR') + ' FCFA', 420, 407, { align: 'right', width: 110 });
    // 4. Legal Declaration
    doc.fontSize(10).font('Helvetica').fillColor(darkColor)
        .text('Je soussigné mandataire du propriétaire du bien désigné ci-dessus, déclare avoir reçu le montant indiqué au titre du loyer et des charges pour la période mentionnée.', 50, 460, { width: 495, align: 'justify' });
    doc.text('Cette quittance annule tout reçu antérieur et sert de libération de paiement pour la période indiquée.', 50, 490, { width: 495 });
    // 5. Signature and Stamp
    doc.fontSize(11).font('Helvetica-Bold').fillColor(darkColor).text('Le Mandataire (Agence Habitia)', 50, 540);
    doc.fontSize(9).font('Helvetica-Oblique').fillColor(grayColor).text('Signé électroniquement', 50, 560);
    // Draw electronic stamp simulation
    doc.strokeColor(primaryColor).lineWidth(1.5);
    doc.roundedRect(380, 530, 150, 60, 4).stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
        .text('HABITIA SAS', 390, 542, { width: 130, align: 'center' })
        .fontSize(8).font('Helvetica')
        .text('VALIDE & SIGNÉ', 390, 558, { width: 130, align: 'center' })
        .text(new Date(data.paiement.datePaiement).toLocaleDateString('fr-FR'), 390, 570, { width: 130, align: 'center' });
    // End Document
    doc.end();
};
exports.generateQuittancePDF = generateQuittancePDF;
const generateAccountingReportPDF = (res, data) => {
    const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
    doc.pipe(res);
    // Design elements
    const primaryColor = '#2563EB'; // Blue
    const darkColor = '#1F2937';
    const grayColor = '#4B5563';
    const lightGrayColor = '#F3F4F6';
    // 1. Header (Enterprise Logo & Title)
    let headerX = 50;
    const logoWidth = 50;
    const hasLogo = data.enterprise ? addLogoToPdf(doc, data.enterprise.logo, 50, 45, logoWidth) : false;
    if (hasLogo) {
        headerX = 115;
    }
    if (data.enterprise) {
        doc.fillColor(primaryColor)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(data.enterprise.nom, headerX, 45);
        doc.fontSize(8)
            .font('Helvetica')
            .fillColor(grayColor)
            .text(`Adresse : ${data.enterprise.adresse}`, headerX, 65)
            .text(`SIRET : ${data.enterprise.siret} | Tél : ${data.enterprise.telephone || 'N/A'}`, headerX, 75);
    }
    else {
        doc.fillColor(primaryColor)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('Habitia Management', headerX, 45);
    }
    // Right-aligned report title and details
    doc.fillColor(primaryColor)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('RAPPORT COMPTABLE', 300, 45, { align: 'right' });
    doc.fontSize(9)
        .font('Helvetica')
        .fillColor(grayColor)
        .text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 300, 65, { align: 'right' });
    doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text(`Période : ${data.periodLabel}`, 300, 78, { align: 'right' });
    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#E5E7EB').lineWidth(1).stroke();
    // KPIs Summary
    doc.fillColor(lightGrayColor).rect(50, 130, 495, 80).fill();
    doc.fontSize(10).font('Helvetica-Bold').fillColor(grayColor)
        .text('TOTAL REVENUS (COMMISSIONS)', 70, 145)
        .text('TOTAL DÉPENSES', 230, 145)
        .text('BÉNÉFICE NET', 390, 145);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#10B981')
        .text(data.kpis.totalCommissions.toLocaleString('fr-FR') + ' FCFA', 70, 165);
    doc.fillColor('#EF4444')
        .text(data.kpis.totalExpenses.toLocaleString('fr-FR') + ' FCFA', 230, 165);
    doc.fillColor(data.kpis.netProfit >= 0 ? '#10B981' : '#EF4444')
        .text(data.kpis.netProfit.toLocaleString('fr-FR') + ' FCFA', 390, 165);
    // Sections: Revenues & Expenses details
    // Let's print table with transactions in the period
    doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold').text('Journal des Transactions du Rapport', 50, 240);
    doc.moveTo(50, 260).lineTo(545, 260).stroke();
    // Headers
    doc.fontSize(9).font('Helvetica-Bold').fillColor(grayColor);
    doc.text('Date', 50, 270);
    doc.text('Référence / Libellé', 120, 270);
    doc.text('Type / Catégorie', 300, 270);
    doc.text('Montant Brut', 400, 270, { align: 'right', width: 70 });
    doc.text('Part Agence', 480, 270, { align: 'right', width: 65 });
    doc.moveTo(50, 285).lineTo(545, 285).strokeColor('#F3F4F6').stroke();
    let y = 295;
    const transactions = data.transactions || [];
    transactions.slice(0, 20).forEach((t) => {
        if (y > 720)
            return; // avoid overflow
        doc.fontSize(8).font('Helvetica').fillColor(darkColor);
        doc.text(t.date, 50, y);
        doc.text((t.libelle || '').substring(0, 35), 120, y);
        doc.text(t.type === 'encaissement' ? `Revenu / ${t.categorie}` : `Dépense / ${t.categorie}`, 300, y);
        const brut = t.montantBrut !== undefined ? t.montantBrut : t.montant;
        doc.text(brut.toLocaleString('fr-FR') + ' FCFA', 400, y, { align: 'right', width: 70 });
        doc.font('Helvetica-Bold').fillColor(t.type === 'encaissement' ? '#10B981' : '#EF4444');
        const amt = t.type === 'encaissement' ? t.montant : -t.montant;
        doc.text(amt.toLocaleString('fr-FR') + ' FCFA', 480, y, { align: 'right', width: 65 });
        y += 20;
    });
    if (transactions.length > 20) {
        doc.fontSize(8).font('Helvetica-Oblique').fillColor(grayColor)
            .text(`... et ${transactions.length - 20} autres transactions non affichées sur cette page.`, 50, y + 10);
    }
    // Footer
    doc.moveTo(50, 750).lineTo(545, 750).strokeColor('#E5E7EB').stroke();
    doc.fontSize(8).font('Helvetica').fillColor(grayColor)
        .text('Habitia Management System - Document Confidentiel - Généré Automatiquement', 50, 765, { align: 'center', width: 495 });
    doc.end();
};
exports.generateAccountingReportPDF = generateAccountingReportPDF;
