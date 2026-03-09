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

  // PERFECT A4 SCALING ENGINE
  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const paddingOffset = window.innerWidth < 640 ? 40 : 64;
        const availableWidth = window.innerWidth - paddingOffset;
        const targetWidth = 800; // Fixed width of the A4 template

        const newScale =
          availableWidth < targetWidth ? availableWidth / targetWidth : 1;
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

  // PRINT FUNCTION - Scales to fully fit A4 without big outer margins
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
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
            @media print {
              @page { size: A4 portrait; margin: 0; } 
              body { 
                font-family: 'Roboto', Arial, sans-serif;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                background: white !important;
                margin: 0;
                padding: 0;
                display: block;
              }
              .print-wrapper {
                width: 100%;
                margin: 0;
                padding: 0;
              }
              /* Override the fixed 800px width so it naturally fits 100% of the paper */
              .print-wrapper > div {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 100vh !important;
                margin: 0 !important;
                /* Note: We leave padding alone here so it respects the template's internal p-8 Tailwind class */
              }
            }
          </style>
        </head>
        <body class="bg-white text-[#1e3a8a]">
          <div class="print-wrapper">
            ${invoiceContent}
          </div>
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

  // PDF DOWNLOAD - Uses tight bounds to prevent massive side margins
  const handleDownloadPDF = async () => {
    const element = printRef.current;

    element.style.display = "block";
    element.style.position = "fixed";
    element.style.left = "200vw";
    element.style.top = "0";

    try {
      toast.info("Generating high-quality PDF...");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        windowWidth: 800, // Matched exactly to the template width to drop excess margins
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 5, pdfWidth, pdfHeight); // Added small 5mm top offset
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
    const message = `*TAX INVOICE*\n------------------------\n*Invoice No:* ${invoice.invoiceNumber}\n*Date:* ${new Date(invoice.date).toLocaleDateString("en-GB")}\n*Client:* ${invoice.client.name}\n------------------------\n*Total Amount:* ₹ ${invoice.grandTotal.toLocaleString("en-IN")}\n------------------------\nPlease find your invoice details attached. Thank you!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

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

  const emptyRowsNeeded = Math.max(0, 10 - invoice.items.length);
  const renderEmptyRows = (count) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(
        <tr key={`empty-${i}`} className="h-[30px]">
          <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
          <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
          <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
          <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
          <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
          <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
          <td></td>
        </tr>,
      );
    }
    return rows;
  };

  // CORE INVOICE TEMPLATE
  const InvoiceTemplate = () => (
    <div
      className="w-[800px] h-[1123px] bg-white text-[#1e3a8a] font-sans box-border relative flex flex-col p-8 pt-12 pb-6 mx-auto"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="relative w-[500px] h-[500px] opacity-[0.15]">
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
      <div className="border-[2px] border-[#1e3a8a] flex-1 flex flex-col relative z-10 bg-white/60 mt-6 rounded-sm">
        {/* TOP BADGE */}
        <div className="absolute -top-[14px] left-1/2 transform -translate-x-1/2 bg-white px-3 flex items-center justify-center">
          <span className="bg-[#1e3a8a] text-white font-bold px-4 py-[3px] rounded text-[13px] tracking-widest uppercase border-[1.5px] border-[#1e3a8a] whitespace-nowrap shadow-sm">
            Tax Invoice
          </span>
        </div>

        {/* HEADER SECTION */}
        <div className="flex justify-between items-start pt-8 pb-3 px-4 border-b-[2px] border-[#1e3a8a]">
          <div className="w-24 h-24 shrink-0 flex items-center justify-center">
            <img
              src="/maa.jpg"
              alt="Logo"
              className="w-full h-full object-contain mix-blend-multiply"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>

          <div className="flex-1 text-center px-2 pt-1">
            <h1 className="text-[34px] font-black tracking-tight uppercase leading-tight text-[#1e3a8a]">
              M/S MAA FLYASH BRICKS
            </h1>
            <p className="text-[13px] font-bold mt-1 tracking-wide">
              At-Sundarpur, PO/PS-Chandaka, Dist-Khordha
            </p>
            <p className="text-[13px] font-bold tracking-wide mt-0.5">
              Mob : 8895000797
            </p>
            <p className="text-[13px] font-bold tracking-wide">
              GSTIN : 21COTPP3464E1ZS
            </p>
          </div>

          <div className="w-56 text-right font-bold space-y-3 text-[14px] pt-4 pr-2">
            <div className="flex justify-between items-end">
              <span className="shrink-0 tracking-wide">Invoice No:</span>
              <span className="font-mono border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5 text-[15px]">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="shrink-0 tracking-wide">Date:</span>
              <span className="font-mono border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5 text-[15px]">
                {new Date(invoice.date).toLocaleDateString("en-GB")}
              </span>
            </div>
          </div>
        </div>

        {/* CLIENT DETAILS SECTION (Phone removed) */}
        <div className="px-4 py-3 text-[13px] font-bold space-y-2.5 border-b-[2px] border-[#1e3a8a] leading-relaxed tracking-wide">
          <div className="flex items-end">
            <span className="w-40 shrink-0">Name of the Purchaser:</span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 text-[#1e3a8a]">
              {invoice.client.name}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-16 shrink-0">Address:</span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 px-2 pb-0.5">
              {invoice.client.address || "-"}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-14 shrink-0">GSTIN:</span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 font-mono">
              {invoice.client.gst || "-"}
            </span>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="flex-1 flex flex-col">
          <table className="w-full border-collapse text-[13px] h-full table-fixed font-bold tracking-wide">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[45%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[5%]" />
            </colgroup>

            <thead className="text-center border-b-[2px] border-[#1e3a8a] bg-[#1e3a8a]/[0.03]">
              <tr>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold"
                >
                  SL.
                  <br />
                  No.
                </th>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-2 font-bold text-[14px]"
                >
                  Description of Goods
                </th>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold"
                >
                  HSN
                  <br />
                  Code
                </th>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold"
                >
                  Qnty
                </th>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold"
                >
                  Rate/Price
                </th>
                <th
                  colSpan="2"
                  className="border-b-[1.5px] border-[#1e3a8a] p-1 tracking-widest font-black text-[13px]"
                >
                  AMOUNT
                </th>
              </tr>
              <tr>
                <th className="border-r-[1.5px] border-[#1e3a8a] p-1 text-[11px] font-bold">
                  Rs.
                </th>
                <th className="p-1 text-[11px] font-bold">P.</th>
              </tr>
            </thead>

            <tbody className="align-top font-bold text-[14px]">
              {invoice.items.map((item, i) => {
                const amt = formatRsP(item.total);
                return (
                  <tr key={i}>
                    <td className="border-r-[1.5px] border-[#1e3a8a] p-2 pt-4 text-center font-mono">
                      {i + 1}
                    </td>
                    <td className="border-r-[1.5px] border-[#1e3a8a] p-2 pt-4 pl-4 uppercase">
                      {item.name}
                    </td>
                    <td className="border-r-[1.5px] border-[#1e3a8a] p-2 pt-4 text-center font-mono">
                      {item.hsn || "-"}
                    </td>
                    <td className="border-r-[1.5px] border-[#1e3a8a] p-2 pt-4 text-center font-mono">
                      {item.quantity}
                    </td>
                    <td className="border-r-[1.5px] border-[#1e3a8a] p-2 pt-4 text-right pr-3 font-mono">
                      {Number(item.price).toFixed(2)}
                    </td>
                    <td className="border-r-[1.5px] border-[#1e3a8a] p-2 pt-4 text-right pr-3 font-mono">
                      {amt.rs}
                    </td>
                    <td className="p-2 pt-4 text-center font-mono">{amt.p}</td>
                  </tr>
                );
              })}

              {renderEmptyRows(emptyRowsNeeded)}

              <tr className="h-full">
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-b-[1.5px] border-[#1e3a8a]"></td>
              </tr>
            </tbody>

            {/* CALCULATIONS */}
            <tfoot className="font-bold text-[13px] tracking-wide bg-[#1e3a8a]/[0.02]">
              <tr>
                <td
                  colSpan="4"
                  rowSpan="5"
                  className="border-r-[1.5px] border-[#1e3a8a] p-3 pl-4 align-top bg-white/50"
                >
                  <div className="flex items-start text-[14px]">
                    <span className="shrink-0 mr-2">(Rupees</span>
                    <span className="uppercase border-b-[1.5px] border-[#1e3a8a] border-dotted leading-loose flex-1 px-2 pb-1">
                      {toWords(Math.floor(invoice.grandTotal))}
                    </span>
                    <span className="shrink-0 ml-1">only)</span>
                  </div>
                </td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 pl-3">
                  G. TOTAL
                </td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 text-right pr-3 font-mono">
                  {formatRsP(invoice.subTotal).rs}
                </td>
                <td className="border-b-[1.5px] border-[#1e3a8a] p-2 text-center font-mono">
                  {formatRsP(invoice.subTotal).p}
                </td>
              </tr>

              {invoice.gstRate > 0 ? (
                <>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 pl-3">
                      CGST @ {invoice.gstRate / 2}%
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 text-right pr-3 font-mono">
                      {formatRsP(invoice.gstAmount / 2).rs}
                    </td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] p-2 text-center font-mono">
                      {formatRsP(invoice.gstAmount / 2).p}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 pl-3">
                      SGST @ {invoice.gstRate / 2}%
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 text-right pr-3 font-mono">
                      {formatRsP(invoice.gstAmount / 2).rs}
                    </td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] p-2 text-center font-mono">
                      {formatRsP(invoice.gstAmount / 2).p}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 pl-3">
                      CGST @
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 text-right pr-3"></td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] p-2 text-center"></td>
                  </tr>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 pl-3">
                      SGST @
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 text-right pr-3"></td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] p-2 text-center"></td>
                  </tr>
                </>
              )}

              <tr className="bg-[#1e3a8a]/[0.06]">
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 pl-3">
                  N. TOTAL
                </td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] p-2 text-right pr-3 text-[15px] font-black font-mono">
                  {formatRsP(invoice.grandTotal).rs}
                </td>
                <td className="border-b-[1.5px] border-[#1e3a8a] p-2 text-center font-black font-mono">
                  {formatRsP(invoice.grandTotal).p}
                </td>
              </tr>

              <tr>
                <td className="border-r-[1.5px] border-[#1e3a8a] p-1.5 pl-3">
                  R/O
                </td>
                <td className="border-r-[1.5px] border-[#1e3a8a] p-1.5 text-right pr-3 font-mono">
                  00
                </td>
                <td className="p-1.5 text-center font-mono">00</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* BOTTOM FOOTER / SIGNATURE */}
        <div className="flex justify-between items-end px-4 pt-3 pb-8 text-[11px] font-bold leading-relaxed border-t-[1.5px] border-[#1e3a8a] tracking-wide bg-white/50">
          <div className="space-y-0.5">
            <p>N.B: Goods once sold is not refundable.</p>
            <p>All the disputes are subjects to Bhubaneswar jurisdiction.</p>
            <p>
              This Registration Certificate is valid on the date of issue of
              this Tax Invoice.
            </p>
            <p className="pt-2 text-[#1e3a8a]/70 font-medium">
              Printed at Enterprise Admin System
            </p>
          </div>
          <div className="text-center w-56 flex flex-col items-center pt-10">
            <p className="italic font-bold">Signature of the</p>
            <p className="italic font-bold">Authorised Person</p>
          </div>
        </div>

        {/* Bottom Right Tag */}
        <div className="absolute bottom-2 right-4 font-black uppercase text-[13px] tracking-widest">
          For M/S MAA FLYASH BRICKS
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-full lg:max-w-[900px] mx-auto my-2 md:my-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 px-4">
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

      {/* INVOICE CONTAINER (Responsive & Centered) */}
      <div
        ref={containerRef}
        className="w-full flex justify-center pb-6 overflow-hidden"
      >
        <div
          className="bg-white shadow-[0_0_20px_rgba(16,185,129,0.15)] origin-top rounded-sm"
          style={{
            width: `${800 * scale}px`,
            height: `${1123 * scale}px`,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
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

      {/* HIDDEN WRAPPER FOR PDF GENERATION */}
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
            width: "800px",
            backgroundColor: "white",
            padding: "0px", // Stripped all padding to remove arbitrary white outer edges
          }}
        >
          <InvoiceTemplate />
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
