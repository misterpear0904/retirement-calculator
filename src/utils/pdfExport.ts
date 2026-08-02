import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SimulationResult, RetirementState } from '../types/retirement';

export async function exportToPdf(
  elementId: string,
  state: RetirementState,
  result: SimulationResult
): Promise<void> {
  const element = document.getElementById(elementId);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header Title & Styling
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, pageWidth, 28, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('ApexRetire — Executive Retirement Plan', 14, 15);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text(`Generated on ${new Date().toLocaleDateString()} | Target Location: ${result.targetLocationName}`, 14, 22);

  // Key KPI Summary Table
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Plan Metrics & Monte Carlo Probability', 14, 38);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const metrics = [
    ['Monte Carlo Success Rate:', `${result.successRate}% (${result.successRate >= 80 ? 'Safe' : 'High Risk'})`],
    ['Target Retirement Net Worth:', `$${result.targetRetirementNetWorth.toLocaleString()}`],
    ['Projected Net Worth (Age 90):', `$${result.finalNetWorthAge90.toLocaleString()}`],
    ['Monthly Spending in Retirement:', `$${result.monthlyRetirementSpending.toLocaleString()}`],
    ['Safe Withdrawal Rate (SWR):', `${result.safeWithdrawalRatePct}%`],
    ['Achievable Early FIRE Age:', result.fireAgeAchievable ? `Age ${result.fireAgeAchievable}` : 'N/A (Retires at Target Age)'],
  ];

  let startY = 44;
  metrics.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 14, startY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 80, startY);
    startY += 6;
  });

  // Capture Dashboard Visual Chart
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        backgroundColor: '#0f172a',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.text('Interactive Multi-Scenario Net Worth Projection', 14, startY + 6);
      pdf.addImage(imgData, 'PNG', 14, startY + 10, imgWidth, Math.min(imgHeight, 140));
    } catch (err) {
      console.error('Error capturing dashboard for PDF', err);
    }
  }

  // Save File
  pdf.save(`ApexRetire_Plan_${new Date().toISOString().slice(0, 10)}.pdf`);
}
