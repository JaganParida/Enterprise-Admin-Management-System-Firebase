import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import {
  Printer,
  ArrowLeft,
  Download,
  Share2,
  Phone,
  X,
  Send,
  ChevronDown,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useUI } from "../../context/UIProvider";

// Common country codes for the dropdown
const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
];

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // WhatsApp Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const printRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/30" : "border-indigo-500/30",
    primaryHoverBg: isTransport
      ? "hover:bg-cyan-500/20"
      : "hover:bg-indigo-500/20",
    shadowGlow: isTransport ? "shadow-cyan-900/20" : "shadow-indigo-900/20",
    focusRing: isTransport
      ? "focus:border-cyan-500 focus:ring-cyan-500/20"
      : "focus:border-indigo-500 focus:ring-indigo-500/20",
  };

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

  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const paddingOffset = window.innerWidth < 640 ? 40 : 64;
        const availableWidth = window.innerWidth - paddingOffset;
        const targetWidth = 800;
        const newScale =
          availableWidth < targetWidth ? availableWidth / targetWidth : 1;
        setScale(newScale);
      }
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [invoice]);

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
              @page { size: A4 portrait; margin: 0mm; } 
              body { font-family: 'Roboto', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; margin: 0; padding: 0; }
              .print-wrapper { width: 210mm; height: 297mm; margin: 0; padding: 0; overflow: hidden; }
              .print-wrapper > div { width: 100% !important; height: 100% !important; max-width: none !important; margin: 0 !important; border: none !important; }
            }
          </style>
        </head>
        <body><div class="print-wrapper">${invoiceContent}</div>
        <script>setTimeout(() => { window.print(); window.close(); }, 1000);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    element.style.display = "block";
    element.style.position = "fixed";
    element.style.left = "200vw";
    try {
      toast.info("Generating high-quality PDF...");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        windowWidth: 800,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      pdf.save(`Invoice_${invoice?.invoiceNumber || id}.pdf`);
      toast.success("PDF Downloaded!");
    } catch (err) {
      toast.error("Failed to generate PDF");
    } finally {
      element.style.display = "none";
      element.style.position = "static";
    }
  };

  // 🚀 UPDATED: Comprehensive WhatsApp Message Builder
  const executeWhatsAppShare = (e) => {
    e.preventDefault();
    if (!whatsappNumber || whatsappNumber.length < 5) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Clean number to ensure it only has digits
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const cleanCountryCode = selectedCountry.code.replace(/\D/g, "");
    const fullNumber = `${cleanCountryCode}${cleanNumber}`;

    // Build comprehensive message
    let message = `*TAX INVOICE*\n`;
    message += `*M/S MAA FLYASH BRICKS*\n`;
    message += `-----------------------------------\n`;
    message += `*Invoice No:* ${invoice.invoiceNumber.replace(/^INV-/, "")}\n`;
    message += `*Date:* ${new Date(invoice.date).toLocaleDateString("en-GB")}\n`;
    message += `*Billed To:* ${invoice.client.name}\n`;
    if (invoice.client.address) {
      message += `*Address:* ${invoice.client.address}\n`;
    }
    if (invoice.client.gst) {
      message += `*GSTIN:* ${invoice.client.gst}\n`;
    }
    message += `-----------------------------------\n`;
    message += `*ITEMS:*\n`;

    invoice.items.forEach((item, index) => {
      message += `*${index + 1}. ${item.name}*\n`;
      message += `   Qty: ${item.quantity} | Rate: ₹${Number(item.price).toLocaleString("en-IN")} | Total: ₹${Number(item.total).toLocaleString("en-IN")}\n`;
    });

    message += `-----------------------------------\n`;
    message += `*Subtotal:* ₹${Number(invoice.subTotal).toLocaleString("en-IN")}\n`;

    if (invoice.gstRate > 0) {
      const splitGst = Number(invoice.gstAmount) / 2;
      message += `*CGST (${invoice.gstRate / 2}%):* ₹${splitGst.toLocaleString("en-IN")}\n`;
      message += `*SGST (${invoice.gstRate / 2}%):* ₹${splitGst.toLocaleString("en-IN")}\n`;
    }

    message += `-----------------------------------\n`;
    message += `*GRAND TOTAL: ₹${Number(invoice.grandTotal).toLocaleString("en-IN")}*\n`;
    message += `-----------------------------------\n`;
    message += `Thank you for your business!`;

    window.open(
      `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
    );

    setIsShareModalOpen(false);
    setWhatsappNumber("");
  };

  if (loading) return <Loader />;

  const formatRsP = (amount) => {
    const val = Number(amount).toFixed(2);
    const [rs, p] = val.split(".");
    return { rs: Number(rs).toLocaleString("en-IN"), p };
  };

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
    let n = ("000000000" + num)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
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

  const InvoiceTemplate = () => (
    <div
      className="w-[800px] h-[1123px] bg-white text-[#1e3a8a] font-sans box-border relative flex flex-col p-10 mx-auto"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="relative w-[500px] h-[500px] opacity-[0.35]">
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

      <div className="border-[2px] border-[#1e3a8a] flex-1 flex flex-col relative z-10 bg-white/60 mt-2 rounded-sm">
        <div className="absolute -top-[14px] left-1/2 transform -translate-x-1/2 bg-white px-3 flex items-center justify-center">
          <span className="bg-[#1e3a8a] text-white font-bold px-4 py-[3px] rounded text-[13px] tracking-widest uppercase border-[1.5px] border-[#1e3a8a] whitespace-nowrap shadow-sm">
            Tax Invoice
          </span>
        </div>

        <div className="flex justify-between items-start pt-8 pb-4 px-4 border-b-[2px] border-[#1e3a8a]">
          <div className="w-24 h-24 shrink-0 flex items-center justify-center">
            <img
              src="/maa.jpg"
              alt="Logo"
              className="w-full h-full object-contain mix-blend-multiply"
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
          <div className="w-56 text-right font-bold space-y-4 text-[14px] pt-4 pr-2">
            <div className="flex justify-between items-end">
              <span className="shrink-0 tracking-wide">Invoice No:</span>
              <span className="font-mono border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5 text-[15px]">
                {invoice.invoiceNumber.replace(/^INV-/, "")}
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

        <div className="px-4 py-3 text-[14px] font-bold space-y-3 border-b-[2px] border-[#1e3a8a] leading-relaxed tracking-wide">
          <div className="flex items-end">
            <span className="w-48 shrink-0">Name of the Purchaser:</span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 text-[#1e3a8a] text-[16px] font-black">
              {invoice.client.name}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-20 shrink-0">Address:</span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 px-2 pb-0.5 text-[15px]">
              {invoice.client.address || "-"}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-16 shrink-0">GSTIN:</span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 font-mono text-[16px]">
              {invoice.client.gst || "-"}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <table className="w-full border-collapse text-[13px] h-full table-fixed font-bold tracking-wide">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[39%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
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
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-2 text-center font-mono">
                    {i + 1}
                  </td>
                  <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-4 uppercase">
                    {item.name}
                  </td>
                  <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-2 text-center font-mono">
                    {item.hsn || "-"}
                  </td>
                  <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-2 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-3 text-right font-mono">
                    {Number(item.price).toFixed(2)}
                  </td>
                  <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-3 text-right font-mono">
                    {formatRsP(item.total).rs}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">
                    {formatRsP(item.total).p}
                  </td>
                </tr>
              ))}
              {Array.from({
                length: Math.max(0, 8 - invoice.items.length),
              }).map((_, i) => (
                <tr key={i} className="h-[25px]">
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td></td>
                </tr>
              ))}
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
            <tfoot className="font-bold text-[13px] tracking-wide bg-[#1e3a8a]/[0.02]">
              <tr>
                <td
                  colSpan="4"
                  rowSpan="5"
                  className="border-r-[1.5px] border-[#1e3a8a] p-3 pl-4 align-top bg-white/50"
                >
                  <div className="flex items-start text-[14px]">
                    <span className="shrink-0 mr-2 pt-[3px]">(Rupees</span>
                    <span className="uppercase border-b-[1.5px] border-[#1e3a8a] border-dotted leading-loose flex-1 px-2 pb-1 text-justify break-words">
                      {toWords(Math.floor(invoice.grandTotal))} only)
                    </span>
                  </div>
                </td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                  G. TOTAL
                </td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3 text-right font-mono">
                  {formatRsP(invoice.subTotal).rs}
                </td>
                <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center font-mono">
                  {formatRsP(invoice.subTotal).p}
                </td>
              </tr>
              {invoice.gstRate > 0 ? (
                <>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      CGST @ {invoice.gstRate / 2}%
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3 text-right font-mono">
                      {formatRsP(invoice.gstAmount / 2).rs}
                    </td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center font-mono">
                      {formatRsP(invoice.gstAmount / 2).p}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      SGST @ {invoice.gstRate / 2}%
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3 text-right font-mono">
                      {formatRsP(invoice.gstAmount / 2).rs}
                    </td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center font-mono">
                      {formatRsP(invoice.gstAmount / 2).p}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      CGST @
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3"></td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2"></td>
                  </tr>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      SGST @
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3"></td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2"></td>
                  </tr>
                </>
              )}
              <tr className="bg-[#1e3a8a]/[0.06]">
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                  N. TOTAL
                </td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3 text-right text-[15px] font-black font-mono">
                  {formatRsP(invoice.grandTotal).rs}
                </td>
                <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center font-black font-mono">
                  {formatRsP(invoice.grandTotal).p}
                </td>
              </tr>
              <tr>
                <td className="border-r-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                  R/O
                </td>
                <td className="border-r-[1.5px] border-[#1e3a8a] py-2.5 px-3 text-right font-mono">
                  00
                </td>
                <td className="py-2.5 px-2 text-center font-mono">00</td>
              </tr>
            </tfoot>
          </table>
        </div>

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
          <div className="text-right flex flex-col items-end pt-10">
            <p className="italic font-bold">Signature of the</p>
            <p className="italic font-bold">Authorised Person</p>
            <p className="font-black uppercase text-[13px] tracking-widest mt-1">
              FOR M/S MAA FLYASH BRICKS
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-full lg:max-w-[900px] mx-auto my-2 md:my-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden relative">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-zinc-500 hover:text-white transition-colors self-start sm:self-auto font-medium"
        >
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
          {/* WHATSAPP SHARE MODAL TRIGGER */}
          <Button
            onClick={() => setIsShareModalOpen(true)}
            className="text-xs px-3 py-1.5 gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-lg shadow-green-900/20 flex-1 sm:flex-none justify-center transition-colors"
          >
            <Share2 size={16} /> WhatsApp
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 gap-1.5 rounded-lg flex-1 sm:flex-none justify-center border-zinc-800 hover:bg-zinc-800/50 text-zinc-300 transition-colors"
          >
            <Printer size={16} /> Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className={`text-xs px-3 py-1.5 gap-1.5 rounded-lg ${theme.primaryBg} ${theme.primaryText} border ${theme.primaryBorder} ${theme.primaryHoverBg} shadow-lg ${theme.shadowGlow} flex-1 sm:flex-none justify-center transition-colors`}
          >
            <Download size={16} /> Save PDF
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full flex justify-center pb-6 overflow-hidden"
      >
        <div
          className="bg-white shadow-2xl origin-top rounded-sm"
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

      <div
        style={{ display: "none", position: "fixed", left: "200vw", top: "0" }}
        ref={printRef}
      >
        <div
          style={{ width: "800px", backgroundColor: "white", padding: "0px" }}
        >
          <InvoiceTemplate />
        </div>
      </div>

      {/* WHATSAPP MODAL OVERLAY WITH CUSTOM DROPDOWN */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => {
              setIsShareModalOpen(false);
              setIsDropdownOpen(false);
            }}
          ></div>

          <div className="bg-[#121214] border border-zinc-800/80 shadow-2xl rounded-2xl w-full max-w-[420px] relative z-10 overflow-visible flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-xl shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Share via WhatsApp
                  </h2>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mt-0.5">
                    Send Details to Client
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setIsDropdownOpen(false);
                }}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={executeWhatsAppShare} className="p-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                WhatsApp Number
              </label>

              <div className="flex gap-2 relative">
                {/* Custom Country Dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center justify-between gap-2 h-full bg-[#09090b] border ${
                      isDropdownOpen ? "border-green-500/50" : "border-zinc-800"
                    } text-zinc-100 rounded-xl px-3 py-3 text-sm outline-none transition-all hover:border-zinc-700 w-[100px]`}
                  >
                    <span className="text-lg leading-none">
                      {selectedCountry.flag}
                    </span>
                    <span className="font-medium">{selectedCountry.code}</span>
                    <ChevronDown
                      size={14}
                      className={`text-zinc-500 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      {/* Invisible overlay to close dropdown when clicking outside */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      ></div>

                      <div className="absolute top-full left-0 mt-2 w-[220px] bg-[#121214] border border-zinc-800 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto custom-scrollbar p-1.5 animate-in slide-in-from-top-2 duration-200">
                        {COUNTRY_CODES.map((country) => (
                          <button
                            key={country.name + country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${
                              selectedCountry.code === country.code
                                ? "bg-zinc-800/80 text-white"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                            }`}
                          >
                            <span className="text-lg leading-none">
                              {country.flag}
                            </span>
                            <span className="w-10 font-mono font-medium text-zinc-300">
                              {country.code}
                            </span>
                            <span className="truncate">{country.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Phone Number Input */}
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) =>
                    setWhatsappNumber(e.target.value.replace(/\D/g, ""))
                  }
                  className={`flex-1 bg-[#09090b] border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none transition-all ${theme.focusRing}`}
                  placeholder="e.g. 9876543210"
                  autoFocus
                  required
                />
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setIsDropdownOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-green-900/20 transition-all"
                >
                  <Send size={16} /> Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceView;
