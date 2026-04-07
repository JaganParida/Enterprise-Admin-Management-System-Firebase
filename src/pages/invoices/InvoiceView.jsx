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
  LayoutTemplate,
  Check,
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
];

// Configuration for all templates using the SAME premium layout
const TEMPLATES = {
  MAA: {
    id: "MAA",
    label: "Maa Flyash (Blue)",
    companyName: "M/S MAA FLYASH BRICKS",
    titleSize: "text-[30px]",
    bgColor: "#ffffff",
    hasLogo: true,
    hasQuantity: true,
    footerNote: "Printed at Enterprise Admin System",
    signature: "FOR M/S MAA FLYASH BRICKS",
    designation: null,
    watermark: true,
    labels: {
      sl: "SL.\nNo.",
      desc: "Description of Goods",
      hsnCode: "HSN\nCode",
      qty: "Qnty",
      rate: "Rate/Price",
      amountCol: "AMOUNT",
      amountRs: "Rs.",
      amountP: "P.",
      clientName: "Name of the Purchaser:",
      address: "Address:",
      gstin: "GSTIN:",
    },
    headerLines: [
      {
        text: "At-Sundarpur, PO/PS-Chandaka, Dist-Khordha",
        style: "text-[13px] font-bold mt-1",
      },
      { text: "Mob : 8895000797", style: "text-[13px] font-bold mt-0.5" },
      { text: "GSTIN : 21COTPP3464E1ZS", style: "text-[13px] font-bold" },
    ],
  },
  SANJIB: {
    id: "SANJIB",
    label: "Sanjib Parida (B&W)",
    companyName: "M/S SANJIB PARIDA",
    titleSize: "text-[30px]",
    bgColor: "#ffffff",
    hasLogo: false,
    hasQuantity: true,
    footerNote: "",
    signature: "FOR M/S SANJIB PARIDA",
    designation: null,
    watermark: false,
    labels: {
      sl: "SL.\nNo.",
      desc: "Description of Goods",
      hsnCode: "HSN\nCode",
      qty: "Qnty.",
      rate: "Rate/Price",
      amountCol: "AMOUNT",
      amountRs: "Rs.",
      amountP: "P.",
      clientName: "Name of the Purchaser:",
      address: "Address:",
      gstin: "GSTIN:",
    },
    headerLines: [
      {
        text: "At-Sundarpur, PO/PS-Chandaka, Dist-Khordha, Bhubaneswar-754005",
        style: "text-[13px] font-bold mt-1",
      },
      { text: "Mob : 8895000797", style: "text-[13px] font-bold mt-0.5" },
      { text: "GSTIN : 21CLGPP0804E1ZP", style: "text-[13px] font-bold" },
    ],
  },
  SANDEEP: {
    id: "SANDEEP",
    label: "Sandeep Parida (Yellow)",
    companyName: "M/S SANDEEP PARIDA",
    titleSize: "text-[30px]",
    bgColor: "#FDF28E",
    hasLogo: false,
    hasQuantity: true,
    footerNote: "",
    signature: "FOR M/S SANDEEP PARIDA",
    designation: null,
    watermark: false,
    labels: {
      sl: "Sl\nNo.",
      desc: "Description of Goods",
      hsnCode: "HSN\nCode",
      qty: "Quantity",
      rate: "Unit Price",
      amountCol: "Amount",
      amountRs: "Rs.",
      amountP: "P.",
      clientName: "Name of the Purchaser:",
      address: "Address:",
      gstin: "GSTIN:",
    },
    headerLines: [
      {
        text: "GSTIN : 21CSNPP0025P1ZK",
        style: "text-[16px] font-black tracking-wide mt-1",
      },
      {
        text: "At- Sundarpur, PO/PS-Chandaka, Dist- Khordha, Bhubaneswar- 754005",
        style: "text-[13px] font-bold mt-0.5",
      },
      { text: "Mob : 827090364", style: "text-[13px] font-bold" },
    ],
  },
  SACHIDA: {
    id: "SACHIDA",
    label: "Sachida Nanda (Service)",
    companyName: "M/S SACHIDA NANDA PARIDA",
    titleSize: "text-[24px]", // Shrunk to fit long name inside grid without wrap/overlap
    designation: "(Special Class Contractor)",
    bgColor: "#ffffff",
    hasLogo: false,
    hasQuantity: false, // NO QUANTITY COLUMN FOR SERVICE BILLS
    footerNote: "",
    signature: "FOR M/S SACHIDA NANDA PARIDA",
    watermark: false,
    labels: {
      sl: "Sl.\nNo.",
      desc: "DESCRIPTION OF SERVICE",
      hsnCode: "HSN\nCode",
      qty: "Quantity",
      rate: "Price",
      amountCol: "Amount",
      amountRs: "Rs.",
      amountP: "P.",
      clientName: "Name of the Customer / Party:",
      address: "Address:",
      gstin: "GSTIN:",
    },
    headerLines: [
      {
        text: "At- Sundarpur, Po- Chandaka, Dist- Khordha",
        style: "text-[13px] font-bold mt-1",
      },
      { text: "Mob: 9337889997", style: "text-[13px] font-bold mt-0.5" },
      {
        text: "GSTIN : 21AIPPP9903Q1ZH",
        style: "text-[16px] font-black tracking-wide mt-0.5",
      },
    ],
  },
};

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Template Selection State
  const [activeTemplateId, setActiveTemplateId] = useState("MAA");
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const activeConfig = TEMPLATES[activeTemplateId];

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
    gradientBg: isTransport
      ? "from-cyan-600 to-blue-600"
      : "from-indigo-600 to-purple-600",
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await invoiceService.getInvoiceById(id);
        setInvoice(data);
        if (data.templateType && TEMPLATES[data.templateType]) {
          setActiveTemplateId(data.templateType);
        }
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
  }, [invoice, activeTemplateId]);

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
              body { 
                font-family: 'Roboto', sans-serif; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                background: white !important; 
                margin: 0; padding: 0; 
              }
              .print-wrapper { width: 210mm; height: 297mm; margin: 0; padding: 0; overflow: hidden; background-color: ${activeConfig.bgColor} !important;}
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
        backgroundColor: activeConfig.bgColor,
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

  const executeWhatsAppShare = (e) => {
    e.preventDefault();
    if (!whatsappNumber || whatsappNumber.length < 5) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const cleanCountryCode = selectedCountry.code.replace(/\D/g, "");
    const fullNumber = `${cleanCountryCode}${cleanNumber}`;

    let message = `*TAX INVOICE*\n`;
    message += `*${activeConfig.companyName}*\n`;
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
      if (activeConfig.hasQuantity) {
        message += `  Qty: ${item.quantity} | Rate: ₹${Number(item.price).toLocaleString("en-IN")} | Total: ₹${Number(item.total).toLocaleString("en-IN")}\n`;
      } else {
        message += `  Price: ₹${Number(item.price).toLocaleString("en-IN")} | Total: ₹${Number(item.total).toLocaleString("en-IN")}\n`;
      }
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

  const MasterInvoiceTemplate = () => (
    <div
      className="w-[800px] h-[1123px] text-[#1e3a8a] font-sans box-border relative flex flex-col p-10 mx-auto"
      style={{
        fontFamily: "Arial, sans-serif",
        backgroundColor: activeConfig.bgColor,
      }}
    >
      {/* Background Watermark */}
      {activeConfig.watermark && (
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
                  {activeConfig.companyName} • {activeConfig.companyName} •
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
      )}

      {/* Main Border Container */}
      <div
        className={`border-[2px] border-[#1e3a8a] flex-1 flex flex-col relative z-10 mt-2 rounded-sm ${activeConfig.bgColor === "#ffffff" ? "bg-white/60" : ""}`}
      >
        {/* TAX INVOICE BADGE */}
        <div
          className="absolute -top-[14px] left-1/2 transform -translate-x-1/2 px-3 flex items-center justify-center"
          style={{ backgroundColor: activeConfig.bgColor }}
        >
          <span className="bg-[#1e3a8a] text-white font-bold px-4 py-[3px] rounded text-[13px] tracking-widest uppercase border-[1.5px] border-[#1e3a8a] whitespace-nowrap shadow-sm">
            Tax Invoice
          </span>
        </div>

        {/* HEADER SECTION - FIXED WITH CSS GRID TO PREVENT OVERLAP */}
        <div className="grid grid-cols-[85px_1fr_140px] gap-2 items-center pt-8 pb-4 px-4 border-b-[2px] border-[#1e3a8a] w-full">
          {/* Logo Column */}
          <div className="flex justify-start items-center h-full">
            {activeConfig.hasLogo && (
              <img
                src="/maa.jpg"
                alt="Logo"
                className="w-20 h-20 object-contain mix-blend-multiply"
              />
            )}
          </div>

          {/* Title Column - Strictly restricted by Grid width with min-w-0 */}
          <div className="flex flex-col items-center justify-center text-center min-w-0">
            <h1
              className={`font-black uppercase text-[#1e3a8a] whitespace-nowrap tracking-tight ${activeConfig.titleSize}`}
              style={{ transform: "scaleY(1.15)" }}
            >
              {activeConfig.companyName}
            </h1>
            {activeConfig.designation && (
              <p className="text-[14px] font-bold mt-2 whitespace-nowrap">
                {activeConfig.designation}
              </p>
            )}
            {activeConfig.headerLines.map((line, idx) => (
              <p key={idx} className={`${line.style} tracking-wide`}>
                {line.text}
              </p>
            ))}
          </div>

          {/* Details Column */}
          <div className="flex flex-col justify-center space-y-3 font-bold text-[14px]">
            <div className="flex justify-between items-end w-full">
              <span className="shrink-0 tracking-wide">Invoice No:</span>
              <span className="font-mono border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5 text-[14px]">
                {invoice?.invoiceNumber?.replace(/^INV-/, "") || ""}
              </span>
            </div>
            <div className="flex justify-between items-end w-full">
              <span className="shrink-0 tracking-wide">Date:</span>
              <span className="font-mono border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 text-right ml-2 pb-0.5 text-[14px]">
                {invoice?.date
                  ? new Date(invoice.date).toLocaleDateString("en-GB")
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {/* CLIENT DETAILS */}
        <div className="px-4 py-3 text-[14px] font-bold space-y-3 border-b-[2px] border-[#1e3a8a] leading-relaxed tracking-wide">
          <div className="flex items-end">
            <span className="w-auto shrink-0 mr-2 whitespace-nowrap">
              {activeConfig.labels.clientName}
            </span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 text-[#1e3a8a] text-[16px] font-black">
              {invoice.client.name}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-20 shrink-0 whitespace-nowrap">
              {activeConfig.labels.address}
            </span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 px-2 pb-0.5 text-[15px]">
              {invoice.client.address || "-"}
            </span>
          </div>
          <div className="flex items-end">
            <span className="w-16 shrink-0 whitespace-nowrap">
              {activeConfig.labels.gstin}
            </span>
            <span className="border-b-[1.5px] border-[#1e3a8a] border-dotted flex-1 uppercase px-2 pb-0.5 font-mono text-[16px]">
              {invoice.client.gst || "-"}
            </span>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="flex-1 flex flex-col">
          <table className="w-full border-collapse text-[13px] h-full table-fixed font-bold tracking-wide">
            {activeConfig.hasQuantity ? (
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[38%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[5%]" />
              </colgroup>
            ) : (
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[46%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[5%]" />
              </colgroup>
            )}

            <thead className="text-center border-b-[2px] border-[#1e3a8a] bg-[#1e3a8a]/[0.03]">
              <tr>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold whitespace-pre-line whitespace-nowrap"
                >
                  {activeConfig.labels.sl}
                </th>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-2 font-bold text-[14px] whitespace-nowrap"
                >
                  {activeConfig.labels.desc}
                </th>
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold whitespace-nowrap whitespace-pre-line"
                >
                  {activeConfig.labels.hsnCode}
                </th>
                {activeConfig.hasQuantity && (
                  <th
                    rowSpan="2"
                    className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold whitespace-nowrap"
                  >
                    {activeConfig.labels.qty}
                  </th>
                )}
                <th
                  rowSpan="2"
                  className="border-r-[1.5px] border-[#1e3a8a] p-1 font-bold whitespace-nowrap"
                >
                  {activeConfig.labels.rate}
                </th>
                <th
                  colSpan="2"
                  className="border-b-[1.5px] border-[#1e3a8a] p-1 tracking-widest font-black text-[13px] whitespace-nowrap"
                >
                  {activeConfig.labels.amountCol}
                </th>
              </tr>
              <tr>
                <th className="border-r-[1.5px] border-[#1e3a8a] p-1 text-[11px] font-bold whitespace-nowrap">
                  {activeConfig.labels.amountRs}
                </th>
                <th className="p-1 text-[11px] font-bold whitespace-nowrap">
                  {activeConfig.labels.amountP}
                </th>
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
                  {activeConfig.hasQuantity && (
                    <td className="border-r-[1.5px] border-[#1e3a8a] py-2 px-2 text-center font-mono">
                      {item.quantity}
                    </td>
                  )}
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
                  {activeConfig.hasQuantity && (
                    <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  )}
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td className="border-r-[1.5px] border-[#1e3a8a]"></td>
                  <td></td>
                </tr>
              ))}
              <tr className="h-full">
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                {activeConfig.hasQuantity && (
                  <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                )}
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a]"></td>
                <td className="border-b-[1.5px] border-[#1e3a8a]"></td>
              </tr>
            </tbody>
            <tfoot className="font-bold text-[13px] tracking-wide bg-[#1e3a8a]/[0.02]">
              <tr>
                <td
                  colSpan={activeConfig.hasQuantity ? "4" : "3"}
                  rowSpan="5"
                  className="border-r-[1.5px] border-[#1e3a8a] p-3 pl-4 align-top"
                  style={{
                    backgroundColor:
                      activeConfig.bgColor === "#ffffff"
                        ? "rgba(255,255,255,0.5)"
                        : "transparent",
                  }}
                >
                  <div className="flex items-start text-[14px]">
                    <span className="shrink-0 mr-2 pt-[3px] whitespace-nowrap">
                      (Rupees
                    </span>
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
                      {activeConfig.labels.cgst} {invoice.gstRate / 2}%
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
                      {activeConfig.labels.sgst} {invoice.gstRate / 2}%
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
                      {activeConfig.labels.cgst}
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-3"></td>
                    <td className="border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2"></td>
                  </tr>
                  <tr>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-[#1e3a8a] py-2.5 px-2 text-center align-middle whitespace-nowrap">
                      {activeConfig.labels.sgst}
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

        {/* FOOTER */}
        <div
          className="flex justify-between items-end px-4 pt-3 pb-8 text-[11px] font-bold leading-relaxed border-t-[1.5px] border-[#1e3a8a] tracking-wide"
          style={{
            backgroundColor:
              activeConfig.bgColor === "#ffffff"
                ? "rgba(255,255,255,0.5)"
                : "transparent",
          }}
        >
          <div className="space-y-0.5">
            <p>N.B: Goods once sold is not refundable.</p>
            <p>All the disputes are subjects to Bhubaneswar jurisdiction.</p>
            <p>
              This Registration Certificate is valid on the date of issue of
              this Tax Invoice.
            </p>
            {activeConfig.footerNote && (
              <p className="pt-2 text-[#1e3a8a]/70 font-medium italic whitespace-pre-line">
                {activeConfig.footerNote}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end pt-10">
            <p className="italic font-bold">Signature of the</p>
            <p className="italic font-bold">Authorised Person</p>
            <p className="font-black uppercase text-[13px] tracking-widest mt-1">
              {activeConfig.signature}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-full lg:max-w-[900px] mx-auto my-2 md:my-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden relative font-sans text-zinc-100">
      {/* Premium Toolbar Matching Create/Edit Views */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6 px-4 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-zinc-400 hover:text-white transition-colors self-start lg:self-auto font-semibold text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>

        <div className="flex gap-3 flex-wrap justify-end w-full lg:w-auto items-center">
          {/* Premium Dropdown for Template Selection */}
          <div className="relative z-50">
            <button
              onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
              className="flex items-center gap-2 bg-[#121214] border border-white/10 hover:border-white/20 text-white rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all shadow-lg"
            >
              <LayoutTemplate size={16} className={theme.primaryText} />
              <span className="max-w-[120px] sm:max-w-none truncate">
                {activeConfig.label}
              </span>
              <ChevronDown
                size={14}
                className={`text-zinc-500 transition-transform ${isTemplateMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isTemplateMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsTemplateMenuOpen(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-60 bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="p-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/60 bg-[#0A0A0C]">
                    Select Bill Format
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    {Object.values(TEMPLATES).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setActiveTemplateId(template.id);
                          setIsTemplateMenuOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all ${
                          activeTemplateId === template.id
                            ? "bg-zinc-800/80 text-white font-bold"
                            : "text-zinc-400 hover:bg-zinc-800/40 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full border border-zinc-700 shadow-inner ${template.bgColor === "#FDF28E" ? "bg-[#FDF28E]" : "bg-white"}`}
                          ></div>
                          {template.label}
                        </div>
                        {activeTemplateId === template.id && (
                          <Check size={14} className={theme.primaryText} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={() => setIsShareModalOpen(true)}
            className="text-xs sm:text-sm px-4 py-2.5 gap-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-lg shadow-green-900/20 flex-1 sm:flex-none justify-center transition-colors font-bold"
          >
            <Share2 size={16} /> WhatsApp
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs sm:text-sm px-4 py-2.5 gap-2 rounded-xl flex-1 sm:flex-none justify-center border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-colors bg-[#121214] font-bold"
          >
            <Printer size={16} /> Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className={`text-xs sm:text-sm px-4 py-2.5 gap-2 rounded-xl border-0 bg-gradient-to-r ${theme.gradientBg} shadow-lg shadow-indigo-500/20 hover:brightness-110 flex-1 sm:flex-none justify-center transition-all font-bold text-white`}
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
          className="shadow-2xl origin-top rounded-sm transition-colors duration-300"
          style={{
            width: `${800 * scale}px`,
            height: `${1123 * scale}px`,
            position: "relative",
            backgroundColor: activeConfig.bgColor,
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
              backgroundColor: activeConfig.bgColor,
            }}
          >
            <MasterInvoiceTemplate />
          </div>
        </div>
      </div>

      {/* Hidden Print Wrapper */}
      <div
        style={{ display: "none", position: "fixed", left: "200vw", top: "0" }}
        ref={printRef}
      >
        <div
          style={{
            width: "800px",
            backgroundColor: activeConfig.bgColor,
            padding: "0px",
          }}
        >
          <MasterInvoiceTemplate />
        </div>
      </div>

      {/* WHATSAPP MODAL OVERLAY */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => {
              setIsShareModalOpen(false);
              setIsDropdownOpen(false);
            }}
          ></div>

          <div className="bg-[#0A0A0C] border border-white/10 shadow-2xl rounded-2xl w-full max-w-[440px] relative z-10 overflow-visible flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#25D366]/10 text-[#25D366] rounded-xl shrink-0 border border-[#25D366]/20">
                  <Phone size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Share via WhatsApp
                  </h2>
                  <p className="text-zinc-500 text-[11px] uppercase tracking-[0.1em] font-bold mt-1">
                    Send Details to Client
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setIsDropdownOpen(false);
                }}
                className="text-zinc-500 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={executeWhatsAppShare} className="p-6">
              <label className="block text-sm font-semibold text-zinc-300 mb-3">
                Client WhatsApp Number
              </label>

              <div className="flex gap-3 relative">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center justify-between gap-2 h-full bg-[#121214] border ${isDropdownOpen ? "border-green-500/50" : "border-white/10 hover:border-white/20"} text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-all w-[110px] shadow-inner`}
                  >
                    <span className="text-xl leading-none">
                      {selectedCountry.flag}
                    </span>
                    <span className="font-bold">{selectedCountry.code}</span>
                    <ChevronDown
                      size={14}
                      className={`text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      ></div>
                      <div className="absolute top-full left-0 mt-2 w-[240px] bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto custom-scrollbar p-1.5 animate-in slide-in-from-top-2 duration-200">
                        {COUNTRY_CODES.map((country) => (
                          <button
                            key={country.name + country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors text-left ${selectedCountry.code === country.code ? "bg-zinc-800/80 text-white font-bold" : "text-zinc-400 hover:text-white hover:bg-white/5 font-medium"}`}
                          >
                            <span className="text-lg leading-none">
                              {country.flag}
                            </span>
                            <span className="w-12 font-mono">
                              {country.code}
                            </span>
                            <span className="truncate">{country.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) =>
                    setWhatsappNumber(e.target.value.replace(/\D/g, ""))
                  }
                  className={`flex-1 bg-[#121214] border border-white/10 text-white font-semibold tracking-wide rounded-xl px-4 py-3.5 text-sm outline-none transition-all shadow-inner focus:border-green-500/50`}
                  placeholder="e.g. 98765 43210"
                  autoFocus
                  required
                />
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setIsDropdownOpen(false);
                  }}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-green-900/20 transition-all"
                >
                  <Send size={18} /> Send Document
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
