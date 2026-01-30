import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'

// Company branding colors
const BRAND_COLORS = {
  primary: [79, 70, 229], // Indigo
  secondary: [155, 77, 255], // Purple
  success: [16, 185, 129], // Green
  warning: [245, 158, 11], // Amber
  danger: [239, 68, 68], // Red
  text: [30, 41, 59], // Slate-800
  textLight: [100, 116, 139], // Slate-500
  background: [248, 250, 252], // Slate-50
}

// Score status colors
const getScoreColor = (score) => {
  if (score >= 80) return BRAND_COLORS.success
  if (score >= 60) return [59, 130, 246] // Blue
  if (score >= 40) return BRAND_COLORS.warning
  return BRAND_COLORS.danger
}

const getScoreLabel = (score) => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'At Risk'
  return 'Critical'
}

/**
 * Generate a professional Health Scores PDF report
 */
export async function generateHealthScoresPDF(data, options = {}) {
  const {
    title = 'Health Scores Report',
    companyName = 'Success Manager',
    companyLogo = null,
    includeCharts = true,
    chartElement = null,
  } = options

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace = 30) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      addFooter()
      return true
    }
    return false
  }

  // Add footer to each page
  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages()
    doc.setFontSize(8)
    doc.setTextColor(...BRAND_COLORS.textLight)
    doc.text(
      `Page ${pageCount} | Generated on ${new Date().toLocaleDateString()} | ${companyName}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // ===== HEADER SECTION =====
  // Background gradient effect (simulated with rectangles)
  doc.setFillColor(...BRAND_COLORS.primary)
  doc.rect(0, 0, pageWidth, 45, 'F')
  doc.setFillColor(...BRAND_COLORS.secondary)
  doc.rect(0, 40, pageWidth, 10, 'F')

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, margin, 20)

  // Report title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(title, margin, 30)

  // Date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 38)

  yPos = 60

  // ===== SUMMARY CARDS =====
  if (data.stats) {
    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', margin, yPos)
    yPos += 10

    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 15) / 4
    const boxHeight = 25
    const stats = [
      { label: 'Avg Score', value: data.stats.avg_score?.toFixed(0) || '0', color: getScoreColor(data.stats.avg_score || 0) },
      { label: 'Total Customers', value: data.stats.total_customers?.toString() || '0', color: BRAND_COLORS.primary },
      { label: 'At Risk', value: data.stats.by_status?.at_risk?.count?.toString() || '0', color: BRAND_COLORS.warning },
      { label: 'Critical', value: data.stats.by_status?.critical?.count?.toString() || '0', color: BRAND_COLORS.danger },
    ]

    stats.forEach((stat, index) => {
      const x = margin + index * (boxWidth + 5)

      // Box background
      doc.setFillColor(...BRAND_COLORS.background)
      doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, 'F')

      // Colored top border
      doc.setFillColor(...stat.color)
      doc.rect(x, yPos, boxWidth, 3, 'F')

      // Value
      doc.setTextColor(...stat.color)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(stat.value, x + boxWidth / 2, yPos + 14, { align: 'center' })

      // Label
      doc.setTextColor(...BRAND_COLORS.textLight)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(stat.label, x + boxWidth / 2, yPos + 21, { align: 'center' })
    })

    yPos += boxHeight + 15
  }

  // ===== SCORE DISTRIBUTION =====
  if (data.stats?.by_status) {
    checkNewPage(50)

    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Score Distribution', margin, yPos)
    yPos += 8

    const distribution = [
      { label: 'Excellent (80-100)', count: data.stats.by_status.excellent?.count || 0, pct: data.stats.by_status.excellent?.percentage || 0, color: BRAND_COLORS.success },
      { label: 'Good (60-79)', count: data.stats.by_status.good?.count || 0, pct: data.stats.by_status.good?.percentage || 0, color: [59, 130, 246] },
      { label: 'At Risk (40-59)', count: data.stats.by_status.at_risk?.count || 0, pct: data.stats.by_status.at_risk?.percentage || 0, color: BRAND_COLORS.warning },
      { label: 'Critical (0-39)', count: data.stats.by_status.critical?.count || 0, pct: data.stats.by_status.critical?.percentage || 0, color: BRAND_COLORS.danger },
    ]

    distribution.forEach((item) => {
      // Label
      doc.setTextColor(...BRAND_COLORS.text)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(item.label, margin, yPos + 4)

      // Progress bar background
      const barX = margin + 50
      const barWidth = pageWidth - margin * 2 - 80
      doc.setFillColor(230, 230, 230)
      doc.roundedRect(barX, yPos, barWidth, 6, 2, 2, 'F')

      // Progress bar fill
      doc.setFillColor(...item.color)
      const fillWidth = (item.pct / 100) * barWidth
      if (fillWidth > 0) {
        doc.roundedRect(barX, yPos, Math.max(fillWidth, 4), 6, 2, 2, 'F')
      }

      // Count and percentage
      doc.setTextColor(...BRAND_COLORS.textLight)
      doc.text(`${item.count} (${item.pct.toFixed(1)}%)`, pageWidth - margin, yPos + 4, { align: 'right' })

      yPos += 10
    })

    yPos += 10
  }

  // ===== CHART IMAGE =====
  if (includeCharts && chartElement) {
    checkNewPage(80)

    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height / canvas.width) * imgWidth

      doc.setTextColor(...BRAND_COLORS.text)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Score Distribution Chart', margin, yPos)
      yPos += 8

      doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 60))
      yPos += Math.min(imgHeight, 60) + 10
    } catch (error) {
      console.error('Failed to capture chart:', error)
    }
  }

  // ===== CUSTOMERS TABLE =====
  if (data.customers && data.customers.length > 0) {
    checkNewPage(40)

    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Health Scores', margin, yPos)
    yPos += 8

    const tableData = data.customers.map((customer) => [
      customer.company_name || '-',
      customer.health_score?.toString() || '0',
      getScoreLabel(customer.health_score || 0),
      customer.score_trend || '-',
      customer.account_manager_name || customer.account_manager || '-',
      customer.status?.replace('_', ' ') || '-',
    ])

    doc.autoTable({
      startY: yPos,
      head: [['Company', 'Score', 'Status', 'Trend', 'Account Manager', 'Customer Status']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: BRAND_COLORS.text,
      },
      headStyles: {
        fillColor: BRAND_COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { cellWidth: 35 },
        5: { halign: 'center', cellWidth: 25 },
      },
      didDrawCell: (data) => {
        // Color code the score column
        if (data.column.index === 1 && data.section === 'body') {
          const score = parseInt(data.cell.raw) || 0
          const color = getScoreColor(score)
          doc.setTextColor(...color)
        }
      },
      margin: { left: margin, right: margin },
    })

    yPos = doc.lastAutoTable.finalY + 10
  }

  // ===== AT RISK CUSTOMERS =====
  const atRiskCustomers = data.customers?.filter(c => (c.health_score || 0) < 60) || []
  if (atRiskCustomers.length > 0) {
    checkNewPage(40)

    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Attention Required - At Risk & Critical Customers', margin, yPos)
    yPos += 8

    const atRiskData = atRiskCustomers.slice(0, 10).map((customer) => [
      customer.company_name || '-',
      customer.health_score?.toString() || '0',
      getScoreLabel(customer.health_score || 0),
      customer.contract_end_date
        ? `${Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))} days`
        : '-',
      customer.account_manager_name || customer.account_manager || '-',
    ])

    doc.autoTable({
      startY: yPos,
      head: [['Company', 'Score', 'Status', 'Renewal', 'Account Manager']],
      body: atRiskData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: BRAND_COLORS.danger,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242], // Red-50
      },
      margin: { left: margin, right: margin },
    })
  }

  // Add footer to all pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...BRAND_COLORS.textLight)
    doc.text(
      `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()} | ${companyName}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // Save the PDF
  const fileName = `health-scores-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)

  return fileName
}

/**
 * Generate a customer detail PDF
 */
export async function generateCustomerDetailPDF(customer, healthHistory = [], options = {}) {
  const {
    companyName = 'Success Manager',
  } = options

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Header
  doc.setFillColor(...BRAND_COLORS.primary)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(customer.company_name || 'Customer Report', margin, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Health Score Report | ${new Date().toLocaleDateString()}`, margin, 28)

  yPos = 55

  // Score card
  const score = customer.health_score || 0
  const scoreColor = getScoreColor(score)

  doc.setFillColor(...BRAND_COLORS.background)
  doc.roundedRect(margin, yPos, 50, 35, 3, 3, 'F')

  doc.setTextColor(...scoreColor)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text(score.toString(), margin + 25, yPos + 18, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(...BRAND_COLORS.textLight)
  doc.text(getScoreLabel(score), margin + 25, yPos + 28, { align: 'center' })

  // Customer info
  const infoX = margin + 60
  doc.setTextColor(...BRAND_COLORS.text)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const info = [
    ['Industry:', customer.industry || '-'],
    ['Status:', (customer.status || '-').replace('_', ' ')],
    ['Account Manager:', customer.account_manager_name || customer.account_manager || '-'],
    ['Contract Value:', customer.contract_value ? `$${parseFloat(customer.contract_value).toLocaleString()}` : '-'],
  ]

  info.forEach((item, idx) => {
    doc.setFont('helvetica', 'bold')
    doc.text(item[0], infoX, yPos + 8 + (idx * 7))
    doc.setFont('helvetica', 'normal')
    doc.text(item[1], infoX + 35, yPos + 8 + (idx * 7))
  })

  yPos += 50

  // Health history table
  if (healthHistory.length > 0) {
    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Health Score History', margin, yPos)
    yPos += 8

    const historyData = healthHistory.slice(0, 10).map((h) => [
      h.calculated_at ? new Date(h.calculated_at).toLocaleDateString() : '-',
      h.overall_score?.toString() || '-',
      h.engagement_score?.toString() || '-',
      h.adoption_score?.toString() || '-',
      h.support_score?.toString() || '-',
      h.financial_score?.toString() || '-',
    ])

    doc.autoTable({
      startY: yPos,
      head: [['Date', 'Overall', 'Engagement', 'Adoption', 'Support', 'Financial']],
      body: historyData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: BRAND_COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
      },
      margin: { left: margin, right: margin },
    })
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(...BRAND_COLORS.textLight)
  doc.text(
    `Generated by ${companyName} | ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  )

  const fileName = `${(customer.company_name || 'customer').toLowerCase().replace(/\s+/g, '-')}-health-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)

  return fileName
}

/**
 * Generate a professional Customers List PDF report
 */
export async function generateCustomersPDF(customers, options = {}) {
  const {
    title = 'Customers Report',
    companyName = 'Success Manager',
    filters = {},
  } = options

  const doc = new jsPDF('l', 'mm', 'a4') // Landscape for better table fit
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // ===== HEADER SECTION =====
  doc.setFillColor(...BRAND_COLORS.primary)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.setFillColor(...BRAND_COLORS.secondary)
  doc.rect(0, 32, pageWidth, 8, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, margin, 16)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(title, margin, 26)

  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 16, { align: 'right' })
  doc.text(`Total: ${customers.length} customers`, pageWidth - margin, 24, { align: 'right' })

  yPos = 50

  // ===== SUMMARY STATISTICS =====
  const activeCount = customers.filter(c => c.status === 'active').length
  const atRiskCount = customers.filter(c => (c.health_score || 0) < 60 && (c.health_score || 0) >= 40).length
  const criticalCount = customers.filter(c => (c.health_score || 0) < 40).length
  const avgHealth = customers.length > 0
    ? Math.round(customers.reduce((sum, c) => sum + (c.health_score || 0), 0) / customers.length)
    : 0
  const totalContractValue = customers.reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0)

  doc.setTextColor(...BRAND_COLORS.text)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Portfolio Summary', margin, yPos)
  yPos += 8

  const boxWidth = (pageWidth - margin * 2 - 20) / 5
  const boxHeight = 22
  const summaryStats = [
    { label: 'Total Customers', value: customers.length.toString(), color: BRAND_COLORS.primary },
    { label: 'Active', value: activeCount.toString(), color: BRAND_COLORS.success },
    { label: 'At Risk', value: atRiskCount.toString(), color: BRAND_COLORS.warning },
    { label: 'Critical', value: criticalCount.toString(), color: BRAND_COLORS.danger },
    { label: 'Avg Health', value: avgHealth.toString(), color: getScoreColor(avgHealth) },
  ]

  summaryStats.forEach((stat, index) => {
    const x = margin + index * (boxWidth + 5)

    doc.setFillColor(...BRAND_COLORS.background)
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'F')

    doc.setFillColor(...stat.color)
    doc.rect(x, yPos, boxWidth, 2.5, 'F')

    doc.setTextColor(...stat.color)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(stat.value, x + boxWidth / 2, yPos + 12, { align: 'center' })

    doc.setTextColor(...BRAND_COLORS.textLight)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(stat.label, x + boxWidth / 2, yPos + 18, { align: 'center' })
  })

  yPos += boxHeight + 12

  // Contract value summary
  doc.setFillColor(...BRAND_COLORS.background)
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 16, 2, 2, 'F')

  doc.setTextColor(...BRAND_COLORS.text)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Contract Value:', margin + 5, yPos + 10)

  doc.setTextColor(...BRAND_COLORS.primary)
  doc.setFontSize(14)
  doc.text(`$${totalContractValue.toLocaleString()}`, margin + 50, yPos + 10)

  yPos += 25

  // ===== CUSTOMERS TABLE =====
  doc.setTextColor(...BRAND_COLORS.text)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Details', margin, yPos)
  yPos += 6

  const tableData = customers.map((customer) => [
    customer.company_name || '-',
    customer.industry || '-',
    customer.contact_name || '-',
    customer.contact_email || '-',
    customer.health_score?.toString() || '-',
    getScoreLabel(customer.health_score || 0),
    customer.contract_value ? `$${parseFloat(customer.contract_value).toLocaleString()}` : '-',
    customer.contract_end_date ? new Date(customer.contract_end_date).toLocaleDateString() : '-',
    customer.account_manager_name || customer.account_manager || '-',
    (customer.status || '-').replace('_', ' '),
  ])

  doc.autoTable({
    startY: yPos,
    head: [['Company', 'Industry', 'Contact', 'Email', 'Score', 'Health', 'Value', 'Renewal', 'Manager', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: BRAND_COLORS.text,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: BRAND_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Company
      1: { cellWidth: 25 }, // Industry
      2: { cellWidth: 25 }, // Contact
      3: { cellWidth: 40 }, // Email
      4: { halign: 'center', cellWidth: 12 }, // Score
      5: { halign: 'center', cellWidth: 18 }, // Health
      6: { halign: 'right', cellWidth: 22 }, // Value
      7: { halign: 'center', cellWidth: 22 }, // Renewal
      8: { cellWidth: 28 }, // Manager
      9: { halign: 'center', cellWidth: 18 }, // Status
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawCell: (data) => {
      // Color code the score column
      if (data.column.index === 4 && data.section === 'body') {
        const score = parseInt(data.cell.raw) || 0
        const color = getScoreColor(score)
        doc.setTextColor(...color)
      }
      // Color code the health status column
      if (data.column.index === 5 && data.section === 'body') {
        const text = data.cell.raw
        let color = BRAND_COLORS.textLight
        if (text === 'Excellent') color = BRAND_COLORS.success
        else if (text === 'Good') color = [59, 130, 246]
        else if (text === 'At Risk') color = BRAND_COLORS.warning
        else if (text === 'Critical') color = BRAND_COLORS.danger
        doc.setTextColor(...color)
      }
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Add page footer
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber
      doc.setFontSize(8)
      doc.setTextColor(...BRAND_COLORS.textLight)
      doc.text(
        `${companyName} | Customers Report`,
        margin,
        pageHeight - 8
      )
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      )
    },
  })

  // Add footer to first page if not already added
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...BRAND_COLORS.textLight)
    doc.text(
      `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()} | ${companyName}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // Save the PDF
  const fileName = `customers-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)

  return fileName
}

export default {
  generateHealthScoresPDF,
  generateCustomerDetailPDF,
  generateCustomersPDF,
}
