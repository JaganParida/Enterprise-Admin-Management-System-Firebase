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
        toast.error("Failed to load invoice data");
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, toast]);

  // ✅ PERFECT A4 SCALING ENGINE
  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const paddingOffset = window.innerWidth < 640 ? 10 : 32;
        const availableWidth = window.innerWidth - paddingOffset;
        const newScale = availableWidth < 800 ? availableWidth / 800 : 1;
        setScale(newScale);
      }
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
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
              @page { margin: 10mm; size: A4 portrait; }
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
        <body class="bg-white text-[#1e3a8a] font-sans m-0 p-0">
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

  // ✅ PDF DOWNLOAD (Perfect Safe Rendering)
  const handleDownloadPDF = async () => {
    const element = printRef.current;

    // Bring element out of hide mode but keep away from viewport
    element.style.display = "block";
    element.style.position = "fixed";
    element.style.left = "200vw";
    element.style.top = "0";

    try {
      toast.info("Generating high-quality PDF...");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        windowWidth: 840, // Render canvas slightly larger
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Safe Top Margin so the badge never clips
      pdf.addImage(imgData, "PNG", 0, 5, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice?.invoiceNumber || id}.pdf`);
      toast.success("PDF Downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      element.style.display = "none";
      element.style.position = "static";
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    toast.info("Preparing WhatsApp link...");
    const phone = invoice.client.phone
      ? invoice.client.phone.replace(/\D/g, "")
      : "";
    const message = `*TAX INVOICE*\n------------------------\n*Invoice No:* ${invoice.invoiceNumber}\n*Date:* ${new Date(invoice.date).toLocaleDateString("en-GB")}\n*Client:* ${invoice.client.name}\n------------------------\n*Total Amount:* ₹ ${invoice.grandTotal.toLocaleString("en-IN")}\n------------------------\nPlease find your invoice details attached. Thank you!`;

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

  const toWords = (num) => {
    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    if ((num = num.toString()).length > 9) return "overflow";
    let n = ("000000000" + num)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = "";
    str +=
      n[1] != 0
        ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore "
        : "";
    str +=
      n[2] != 0
        ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh "
        : "";
    str +=
      n[3] != 0
        ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand "
        : "";
    str +=
      n[4] != 0
        ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred "
        : "";
    str +=
      n[5] != 0
        ? (str != "" ? "and " : "") +
          (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
        : "";
    return str.trim();
  };

  const formatRsP = (amount) => {
    const val = Number(amount).toFixed(2);
    const [rs, p] = val.split(".");
    return { rs: Number(rs).toLocaleString("en-IN"), p };
  };

  // Safe table stretching logic
  const emptyRowsNeeded = Math.max(0, 10 - invoice.items.length);
  const renderEmptyRows = (count) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(
        <tr key={`empty-${i}`} className="h-[25px]">
          <td className="border-r-[2px] border-[#1e3a8a]"></td>
          <td className="border-r-[2px] border-[#1e3a8a]"></td>
          <td className="border-r-[2px] border-[#1e3a8a]"></td>
          <td className="border-r-[2px] border-[#1e3a8a]"></td>
          <td className="border-r-[2px] border-[#1e3a8a]"></td>
          <td className="border-r-[2px] border-[#1e3a8a]"></td>
          <td></td>
        </tr>,
      );
    }
    return rows;
  };

  // 🚀 CORE INVOICE TEMPLATE
  const InvoiceTemplate = () => (
    <div className="w-[800px] h-[1123px] bg-white text-[#1e3a8a] font-sans box-border relative flex flex-col p-8 pt-10 pb-6">
      {/* 🚀 WATERMARK - Opacity adjusted for professional tone */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="relative w-[500px] h-[500px] opacity-[0.40]">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full animate-[spin_60s_linear_infinite]"
          >
            <path
              id="textPath"
              d="M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"
              fill="none"
            />
            <text
              fill="#1e3a8a"
              fontSize="16"
              fontWeight="bold"
              letterSpacing="2"
            >
              <textPath href="#textPath" startOffset="0%">
                M/S MAA FLYASH BRICKS • M/S MAA FLYASH BRICKS •
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/maa.jpg"
              alt="Watermark"
              className="w-48 h-48 object-contain rounded-full mix-blend-multiply"
            />
          </div>
        </div>
      </div>

      {/* OUTER BORDER CONTAINER */}
      <div className="border-[2px] border-[#1e3a8a] flex-1 flex flex-col relative z-10 bg-white/70 backdrop-blur-[1px]">
        {/* Top "TAX INVOICE" Badge overlapping border */}
        <div className="absolute -top-[14px] left-1/2 transform -translate-x-1/2 bg-white px-3">
          <span className="bg-[#1e3a8a] text-white font-bold px-4 py-1 rounded text-xs tracking-widest uppercase border border-[#1e3a8a]">
            Tax Invoice
          </span>
        </div>

        {/* --- HEADER SECTION --- */}
        <div className="flex justify-between items-start pt-6 pb-2 px-3 border-b-[2px] border-[#1e3a8a]">
          <div className="w-24 h-24 shrink-0 flex items-center justify-center ml-2">
            <img
              src="/maa.jpg"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>

          <div className="flex-1 text-center px-2 pt-1">
            <h1 className="text-[34px] font-black tracking-wide uppercase leading-tight">
              M/S MAA FLYASH BRICKS
            </h1>
            <p className="text-[13px] font-semibold mt-1">
              At-Sundarpur, PO/PS-Chandaka, Dist-Khordha
            </p>
            <p className="text-[13px] font-bold mt-0.5">Mob : 8895000797</p>
            <p className="text-[13px] font-bold">GSTIN : 21COTPP3464E1ZS</p>
          </div>

          <div className="w-52 text-right font-medium space-y-2 text-[13px] pt-3 pr-2">
            <div className="flex justify-between items-end">
              <span className="shrink-0">Invoice No:</span>
              <span className="font-bold border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="shrink-0">Date:</span>
              <span className="font-bold border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5">
                {new Date(invoice.date).toLocaleDateString("en-GB")}
              </span>
            </div>
          </div>
        </div>

        {/* --- CLIENT DETAILS SECTION --- */}
        <div className="px-3 py-2 text-[12px] font-semibold space-y-2 border-b-[2px] border-[#1e3a8a]">
          <div className="flex items-end">
            <span className="w-36 shrink-0">Name of the Purchaser:</span>
            <span className="font-bold border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase tracking-wide px-2 pb-0.5">
              {invoice.client.name}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-14 shrink-0">Address:</span>
            <span className="font-bold border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 px-2 pb-0.5">
              {invoice.client.address || "-"}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div className="flex flex-1 items-end pr-4">
              <span className="w-12 shrink-0">Phone:</span>
              <span className="font-bold border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 px-2 pb-0.5">
                {invoice.client.phone}
              </span>
            </div>
            <div className="flex w-[40%] items-end">
              <span className="w-12 shrink-0">GSTIN:</span>
              <span className="font-bold border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 text-center">
                {invoice.client.gst || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* --- PERFECT HTML STRICT TABLE SECTION --- */}
        {/* Enforces rigid grid layout for calculation matching */}
        <div className="flex-1 flex flex-col">
          <table className="w-full border-collapse text-[13px] h-full table-fixed">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[44%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[6%]" />
            </colgroup>

            {/* Header */}
            <thead className="bg-[#1e3a8a]/5 text-center font-bold">
              <tr>
                <th
                  rowSpan="2"
                  className="border-b-[2px] border-r-[2px] border-[#1e3a8a] p-1"
                >
                  SL.
                  <br />
                  No.
                </th>
                <th
                  rowSpan="2"
                  className="border-b-[2px] border-r-[2px] border-[#1e3a8a] p-2"
                >
                  Description of Goods
                </th>
                <th
                  rowSpan="2"
                  className="border-b-[2px] border-r-[2px] border-[#1e3a8a] p-1"
                >
                  HSN
                  <br />
                  Code
                </th>
                <th
                  rowSpan="2"
                  className="border-b-[2px] border-r-[2px] border-[#1e3a8a] p-1"
                >
                  Qnty
                </th>
                <th
                  rowSpan="2"
                  className="border-b-[2px] border-r-[2px] border-[#1e3a8a] p-1"
                >
                  Rate/Price
                </th>
                <th
                  colSpan="2"
                  className="border-b-[2px] border-[#1e3a8a] p-1 tracking-widest text-[12px]"
                >
                  AMOUNT
                </th>
              </tr>
              <tr>
                <th className="border-b-[2px] border-r-[2px] border-[#1e3a8a] p-1 text-[11px]">
                  Rs.
                </th>
                <th className="border-b-[2px] border-[#1e3a8a] p-1 text-[11px]">
                  P.
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="align-top">
              {invoice.items.map((item, i) => {
                const amt = formatRsP(item.total);
                return (
                  <tr key={i} className="font-bold">
                    <td className="border-r-[2px] border-[#1e3a8a] p-2 pt-4 text-center">
                      {i + 1}
                    </td>
                    <td className="border-r-[2px] border-[#1e3a8a] p-2 pt-4 uppercase tracking-wide">
                      {item.name}
                    </td>
                    <td className="border-r-[2px] border-[#1e3a8a] p-2 pt-4 text-center font-medium">
                      {item.hsn || "-"}
                    </td>
                    <td className="border-r-[2px] border-[#1e3a8a] p-2 pt-4 text-center">
                      {item.quantity}
                    </td>
                    <td className="border-r-[2px] border-[#1e3a8a] p-2 pt-4 text-right pr-2 font-medium">
                      {Number(item.price).toFixed(2)}
                    </td>
                    <td className="border-r-[2px] border-[#1e3a8a] p-2 pt-4 text-right pr-2">
                      {amt.rs}
                    </td>
                    <td className="p-2 pt-4 text-center">{amt.p}</td>
                  </tr>
                );
              })}

              {renderEmptyRows(emptyRowsNeeded)}

              {/* Extra stretching row to ensure borders hit the bottom calculation seamlessly */}
              <tr className="h-full">
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a]"></td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a]"></td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a]"></td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a]"></td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a]"></td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a]"></td>
                <td className="border-b-[2px] border-[#1e3a8a]"></td>
              </tr>
            </tbody>

            {/* --- CALCULATIONS --- */}
            {/* Uses colspan to sit perfectly inside the grid */}
            <tfoot className="font-bold text-[13px] bg-[#1e3a8a]/[0.02]">
              <tr>
                <td
                  colSpan="4"
                  rowSpan="5"
                  className="border-r-[2px] border-[#1e3a8a] p-3 align-top"
                >
                  <div className="flex items-start">
                    <span className="shrink-0 mr-1.5">(Rupees.</span>
                    <span className="uppercase underline decoration-[#1e3a8a] decoration-dotted underline-offset-4 leading-loose tracking-wide flex-1 px-1">
                      {toWords(Math.floor(invoice.grandTotal))} ONLY
                    </span>
                    <span className="shrink-0 ml-1">)</span>
                  </div>
                </td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-[11px] bg-[#1e3a8a]/5">
                  G. TOTAL
                </td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-right pr-2">
                  {formatRsP(invoice.subTotal).rs}
                </td>
                <td className="border-b-[2px] border-[#1e3a8a] p-1.5 text-center">
                  {formatRsP(invoice.subTotal).p}
                </td>
              </tr>

              {invoice.gstRate > 0 ? (
                <>
                  <tr>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-[11px] bg-[#1e3a8a]/5">
                      CGST @ {invoice.gstRate / 2}%
                    </td>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-right pr-2">
                      {formatRsP(invoice.gstAmount / 2).rs}
                    </td>
                    <td className="border-b-[2px] border-[#1e3a8a] p-1.5 text-center">
                      {formatRsP(invoice.gstAmount / 2).p}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-[11px] bg-[#1e3a8a]/5">
                      SGST @ {invoice.gstRate / 2}%
                    </td>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-right pr-2">
                      {formatRsP(invoice.gstAmount / 2).rs}
                    </td>
                    <td className="border-b-[2px] border-[#1e3a8a] p-1.5 text-center">
                      {formatRsP(invoice.gstAmount / 2).p}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-[11px] bg-[#1e3a8a]/5">
                      CGST @
                    </td>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-right pr-2">
                      -
                    </td>
                    <td className="border-b-[2px] border-[#1e3a8a] p-1.5 text-center">
                      -
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-[11px] bg-[#1e3a8a]/5">
                      SGST @
                    </td>
                    <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-right pr-2">
                      -
                    </td>
                    <td className="border-b-[2px] border-[#1e3a8a] p-1.5 text-center">
                      -
                    </td>
                  </tr>
                </>
              )}

              <tr className="font-black text-[13px] bg-[#1e3a8a]/[0.04]">
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 bg-[#1e3a8a]/5">
                  N. TOTAL
                </td>
                <td className="border-r-[2px] border-b-[2px] border-[#1e3a8a] p-1.5 text-right pr-2 text-[14px]">
                  {formatRsP(invoice.grandTotal).rs}
                </td>
                <td className="border-b-[2px] border-[#1e3a8a] p-1.5 text-center">
                  {formatRsP(invoice.grandTotal).p}
                </td>
              </tr>

              <tr>
                <td className="border-r-[2px] border-[#1e3a8a] p-1 text-[11px] bg-[#1e3a8a]/5">
                  R/O
                </td>
                <td className="border-r-[2px] border-[#1e3a8a] p-1 text-right pr-2">
                  00
                </td>
                <td className="p-1 text-center">00</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* --- BOTTOM FOOTER / SIGNATURE --- */}
        <div className="flex justify-between items-end px-3 pt-2 pb-6 text-[10px] font-semibold leading-tight border-t-[2px] border-[#1e3a8a]">
          <div className="space-y-0.5">
            <p>N.B: Goods once sold is not refundable.</p>
            <p>All the disputes are subjects to Bhubaneswar jurisdiction.</p>
            <p>
              This Registration Certificate is valid on the date of issue of
              this Tax Invoice.
            </p>
            <p className="pt-1">Printed by Enterprise Admin System</p>
          </div>
          <div className="text-center w-48 flex flex-col items-center pt-8">
            <div className="h-[1.5px] w-full bg-[#1e3a8a] mb-1"></div>
            <p className="italic font-bold">Signature of the</p>
            <p className="italic font-bold">Authorised Person</p>
          </div>
        </div>

        {/* Bottom Tag */}
        <div className="absolute bottom-1 right-3 font-bold uppercase text-[12px] tracking-wide">
          For M/S MAA FLYASH BRICKS
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[800px] mx-auto my-2 md:my-4 animate-in fade-in slide-in-from-bottom-4 duration-500 px-0 sm:px-2">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 md:mb-4 gap-2 md:gap-4 px-2">
        <button
          onClick={() => navigate("/enterprise/invoices")}
          className="flex items-center text-emerald-100/60 hover:text-white transition-colors self-start sm:self-auto font-medium"
        >
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
          <Button
            onClick={handleShare}
            className="text-xs px-3 py-1.5 gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-lg shadow-emerald-900/20 flex-1 sm:flex-none justify-center"
          >
            <Share2 size={16} /> WhatsApp
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 gap-1.5 flex-1 sm:flex-none justify-center border-emerald-900/40 hover:bg-emerald-900/20 text-emerald-100"
          >
            <Printer size={16} /> Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="text-xs px-3 py-1.5 gap-1.5 shadow-emerald-500/20 flex-1 sm:flex-none justify-center border border-emerald-500/50"
          >
            <Download size={16} /> Save PDF
          </Button>
        </div>
      </div>

      {/* --- INVOICE CONTAINER (Responsive Height Fixed) --- */}
      <div ref={containerRef} className="w-full flex justify-center pb-6">
        <div
          className="bg-white shadow-[0_0_20px_rgba(16,185,129,0.1)] origin-top overflow-hidden"
          style={{ width: `${800 * scale}px`, height: `${1123 * scale}px` }}
        >
          <div
            style={{
              width: "800px",
              height: "1123px",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              backgroundColor: "white",
            }}
          >
            <InvoiceTemplate />
          </div>
        </div>
      </div>

      {/* --- HIDDEN WRAPPER FOR PDF GENERATION --- */}
      <div
        style={{
          display: "none",
          position: "fixed",
          left: "200vw",
          top: "0",
        }}
        ref={printRef}
      >
        <div
          style={{
            width: "840px", // Adding buffer width so borders don't slice off
            backgroundColor: "white",
            padding: "20px", // Prevent top label 'Tax Invoice' from clipping
          }}
        >
          <InvoiceTemplate />
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
