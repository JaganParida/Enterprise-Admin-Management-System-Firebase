import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { Printer, ArrowLeft, Download, Share2 } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useUI } from "../../context/UIProvider";

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs for printing and scaling
  const printRef = useRef(null);
  const containerRef = useRef(null);

  // States for dynamic A4 scaling on mobile
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await invoiceService.getInvoiceById(id);
        setInvoice(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching invoice details:", error);
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  // ✅ PERFECT A4 SCALING ENGINE (Edge-to-Edge Mobile Fit)
  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        // Get available width from the strict parent container
        const availableWidth = containerRef.current.clientWidth;

        // Calculate the scale needed to fit 800px A4 into the available screen width
        const newScale = availableWidth < 800 ? availableWidth / 800 : 1;
        setScale(newScale);
      }
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    // Minor delay to ensure fonts/DOM are fully painted
    const timeout = setTimeout(updateLayout, 100);

    return () => {
      window.removeEventListener("resize", updateLayout);
      clearTimeout(timeout);
    };
  }, [invoice]);

  // ✅ PRINT FUNCTION
  const handlePrint = () => {
    const invoiceContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { margin: 15mm; size: auto; }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                background: white !important;
                width: 800px;
                margin: 0 auto;
              }
            }
          </style>
        </head>
        <body class="bg-white text-slate-800 font-sans p-8">
          ${invoiceContent}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ✅ PDF DOWNLOAD
  const handleDownloadPDF = async () => {
    const element = printRef.current;
    element.style.display = "block";
    element.style.position = "absolute";
    element.style.top = "-9999px";

    try {
      toast.info("Generating high-quality PDF...");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice?.invoiceNumber || id}.pdf`);
      toast.success("PDF Downloaded successfully!");
    } catch (err) {
      toast.error("Failed to generate PDF");
    } finally {
      element.style.display = "none";
    }
  };

  const handleShare = async () => {
    if (!invoice) return;

    toast.info("Preparing WhatsApp link...");
    const phone = invoice.client.phone
      ? invoice.client.phone.replace(/\D/g, "")
      : "";
    const message = `*INVOICE DETAILS*\n------------------------\n*Invoice No:* ${invoice.invoiceNumber}\n*Date:* ${new Date(invoice.date).toLocaleDateString("en-GB")}\n*Client:* ${invoice.client.name}\n------------------------\n*Total Amount:* ₹ ${invoice.grandTotal.toLocaleString()}\n------------------------\nPlease find your invoice document attached. Thank you for your business!`;

    const whatsappUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    setTimeout(() => {
      window.open(whatsappUrl, "_blank");
    }, 500);
  };

  if (loading) return <Loader />;
  if (!invoice)
    return (
      <div className="text-white text-center mt-10">Invoice not found.</div>
    );

  // --- Strict 800px A4 Template ---
  // Purely desktop classes since scaling handles responsiveness
  const InvoiceTemplate = () => (
    <>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            INVOICE
          </h1>
          <p className="text-slate-500 mt-2 font-mono text-lg">
            #{invoice.invoiceNumber}
          </p>
          <div
            className={`mt-2 inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border ${invoice.status === "Paid" ? "bg-green-100 text-green-800 border-green-200" : "bg-orange-100 text-orange-800 border-orange-200"}`}
          >
            {invoice.status}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-emerald-700">
            Enterprise Admin System
          </h2>
          <p className="text-slate-500 text-sm mt-1">123 Industrial Area</p>
          <p className="text-slate-500 text-sm">Bhubaneswar, Odisha - 751024</p>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            GSTIN: 21ABCDE1234F1Z5
          </p>
        </div>
      </div>

      {/* Client & Date */}
      <div className="flex justify-between mb-10 gap-8">
        <div className="w-1/2">
          <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-3">
            Bill To:
          </h3>
          <p className="font-bold text-lg text-slate-900">
            {invoice.client.name}
          </p>
          <p className="text-slate-600 text-sm leading-relaxed mt-1">
            {invoice.client.address || "No Address Provided"}
          </p>
          <p className="text-slate-600 text-sm mt-1">
            Ph: {invoice.client.phone}
          </p>
          {invoice.client.gst && (
            <p className="text-slate-600 text-sm mt-1">
              GST: {invoice.client.gst}
            </p>
          )}
        </div>
        <div className="w-1/2 text-right">
          <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-3">
            Details:
          </h3>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-slate-500 inline-block w-24">Date:</span>
              <span className="font-bold">
                {new Date(invoice.date).toLocaleDateString("en-GB")}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-slate-500 inline-block w-24">Terms:</span>
              <span className="font-bold">Due on Receipt</span>
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-xs uppercase font-bold tracking-wider">
            <th className="py-3 px-4 text-left rounded-l-md w-1/2">
              Description
            </th>
            <th className="py-3 px-4 text-center">Qty</th>
            <th className="py-3 px-4 text-right">Unit Price</th>
            <th className="py-3 px-4 text-right rounded-r-md">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td className="py-4 px-4 font-medium text-slate-800">
                {item.name}
              </td>
              <td className="py-4 px-4 text-center text-slate-600">
                {item.quantity}
              </td>
              <td className="py-4 px-4 text-right text-slate-600">
                ₹{" "}
                {item.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="py-4 px-4 text-right font-bold text-slate-900">
                ₹{" "}
                {item.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end border-t-2 border-slate-800 pt-8">
        <div className="w-72 space-y-3">
          <div className="flex justify-between text-slate-600 text-sm font-medium">
            <span>Sub Total:</span>
            <span>
              ₹{" "}
              {invoice.subTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 text-sm font-medium">
            <span>GST ({invoice.gstRate}%):</span>
            <span>
              ₹{" "}
              {invoice.gstAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-xl font-extrabold text-emerald-700 border-t border-slate-200 pt-4 mt-2">
            <span>Total:</span>
            <span>
              ₹{" "}
              {invoice.grandTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-slate-100 text-center text-slate-400 text-xs flex flex-col items-center">
        <p className="font-bold text-slate-600 mb-1">
          Thank you for your business!
        </p>
        <p>This is a computer-generated invoice and needs no signature.</p>
      </div>
    </>
  );

  return (
    <div className="max-w-[800px] mx-auto my-4 md:my-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-2 sm:px-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <button
          onClick={() => navigate("/enterprise/invoices")}
          className="flex items-center text-emerald-100/60 hover:text-white transition-colors self-start sm:self-auto"
        >
          <ArrowLeft size={18} className="mr-2" /> Back to List
        </button>
        <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
          <Button
            onClick={handleShare}
            className="text-xs px-3 gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-lg shadow-emerald-900/20 flex-1 sm:flex-none justify-center"
          >
            <Share2 size={16} /> WhatsApp
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrint}
            className="text-xs px-3 gap-1.5 flex-1 sm:flex-none justify-center"
          >
            <Printer size={16} /> Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="text-xs px-3 gap-1.5 shadow-emerald-500/20 flex-1 sm:flex-none justify-center"
          >
            <Download size={16} /> PDF
          </Button>
        </div>
      </div>

      {/* --- VISIBLE INVOICE (Perfectly Scaled, No Extra Margins) --- */}
      <div ref={containerRef} className="w-full flex justify-center mt-2">
        <div
          className="bg-white rounded shadow-2xl overflow-hidden"
          style={{
            width: `${800 * scale}px`,
            height: `${1131 * scale}px`,
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: "800px",
              height: "1131px",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              backgroundColor: "white",
            }}
            className="p-10 sm:p-14 text-slate-800"
          >
            <InvoiceTemplate />
          </div>
        </div>
      </div>

      {/* --- HIDDEN INVOICE FOR PERFECT PDF/PRINT --- */}
      <div
        ref={printRef}
        style={{
          display: "none",
          width: "800px",
          padding: "56px" /* Matches p-14 closely for consistency */,
          backgroundColor: "white",
          color: "#1e293b",
          fontFamily: "sans-serif",
        }}
      >
        <InvoiceTemplate />
      </div>
    </div>
  );
};

export default InvoiceView;
