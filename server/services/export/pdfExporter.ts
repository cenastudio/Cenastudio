import jsPDF from 'jspdf';

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  data: any[];
  columns?: Array<{ header: string; key: string }>;
}

/**
 * Exporta dados para PDF (formato simples de relatório)
 */
export function exportToPdf(options: PdfExportOptions): Buffer {
  const { title, subtitle, data, columns } = options;

  const doc = new jsPDF();
  let yPosition = 20;

  // Título
  doc.setFontSize(18);
  doc.text(title, 20, yPosition);
  yPosition += 10;

  // Subtítulo
  if (subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(subtitle, 20, yPosition);
    yPosition += 10;
  }

  // Data de geração
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, yPosition);
  yPosition += 15;

  // Reset cor
  doc.setTextColor(0);

  // Se tiver autoTable instalado, usar (opcional)
  // Por agora, vamos fazer texto simples
  doc.setFontSize(10);

  if (columns && data.length > 0) {
    // Headers
    doc.setFont('helvetica', 'bold');
    let xPosition = 20;
    columns.forEach((col) => {
      doc.text(col.header, xPosition, yPosition);
      xPosition += 40;
    });
    yPosition += 7;

    // Linha separadora
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 7;

    // Dados
    doc.setFont('helvetica', 'normal');
    data.slice(0, 30).forEach((row) => {
      // Limitar a 30 linhas
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      xPosition = 20;
      columns.forEach((col) => {
        const value = String(row[col.key] || '').substring(0, 20); // Limitar tamanho
        doc.text(value, xPosition, yPosition);
        xPosition += 40;
      });
      yPosition += 7;
    });

    // Se tiver mais de 30 itens
    if (data.length > 30) {
      yPosition += 10;
      doc.setTextColor(100);
      doc.text(`... e mais ${data.length - 30} itens`, 20, yPosition);
    }
  } else {
    doc.text('Nenhum dado para exibir', 20, yPosition);
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, 170, 290);
  }

  // Retornar buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Formata dados de projetos para PDF
 */
export function formatProjectsForPdf(projects: any[]): {
  title: string;
  data: any[];
  columns: Array<{ header: string; key: string }>;
} {
  return {
    title: 'Relatório de Projetos',
    data: projects.map((p) => ({
      nome: p.name,
      cliente: p.client_name || 'N/A',
      status: p.status,
      criado: new Date(p.created_at).toLocaleDateString('pt-BR'),
    })),
    columns: [
      { header: 'Nome', key: 'nome' },
      { header: 'Cliente', key: 'cliente' },
      { header: 'Status', key: 'status' },
      { header: 'Criado', key: 'criado' },
    ],
  };
}

/**
 * Formata dados de clientes para PDF
 */
export function formatClientsForPdf(clients: any[]): {
  title: string;
  data: any[];
  columns: Array<{ header: string; key: string }>;
} {
  return {
    title: 'Relatório de Clientes',
    data: clients.map((c) => ({
      nome: c.name,
      empresa: c.company || 'N/A',
      email: c.email || 'N/A',
      status: c.status,
    })),
    columns: [
      { header: 'Nome', key: 'nome' },
      { header: 'Empresa', key: 'empresa' },
      { header: 'Email', key: 'email' },
      { header: 'Status', key: 'status' },
    ],
  };
}
