import { useRef, useState } from "react";
import "./styles.css";

// ---- Output spacing ----
// Number of blank lines between each section of the output.
// Change this one value to adjust the spacing everywhere.
const BLANK_LINES_BETWEEN_SECTIONS = 1;
const SECTION_GAP = "<div><br></div>".repeat(BLANK_LINES_BETWEEN_SECTIONS);

// Builds one section: an optional bold title followed by its lines.
// Empty lines are dropped so missing fields don't leave gaps.
function renderSection(title, lines = []) {
    const body = lines
        .filter(line => line && line.trim())
        .map(line => `<div>${line}</div>`)
        .join("");
    const heading = title ? `<div><strong>${title}</strong></div>` : "";
    return heading + body;
}

function NRFormatter() {
    const sapInputRef = useRef(null);
    const [emailText, setEmailText] = useState("");
    const [outputHtml, setOutputHtml] = useState("");
    const [clearInputsOnCopy, setClearInputsOnCopy] = useState(false);

    function getValue(text, startLabel, endLabels = null) {
        const startIndex = text.indexOf(startLabel);

        if (startIndex === -1) { return ""; }

        const valueStart = startIndex + startLabel.length;
        let valueEnd = text.length;

        if (endLabels) {
            if (!Array.isArray(endLabels)) { endLabels = [endLabels]; }

            endLabels.forEach(label => {
                const index = text.indexOf(label, valueStart);
                if (index !== -1 && index < valueEnd) {valueEnd = index;}
            });
        }

        return text.substring(valueStart, valueEnd).trim();
    }

    function addLine(label, value){
        if (!value?.trim()) { return "";}
        return `${label}: ${value}`;
    }

    function formatPhone(phone) {
        if (!phone) { return ""; }

        let digits = phone.replace(/\D/g, "");

        if (digits.startsWith("640")) { digits = "64" + digits.substring(3); }

        if (digits.startsWith("642") && digits.length >= 10){
            const local = "0" + digits.substring(2);
            return local.replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
        }

        if (digits.startsWith("64") && digits.length >= 10){
            const local = "0" + digits.substring(2);
            return local.replace(/(\d{2})(\d{3})(\d+)/, "$1 $2 $3");
        }
        return phone;
    }

    function formatAddress(address) {
        if (!address) { return ""; }

        return address
            .toLowerCase()
            .replace(/\s+,/g, ",")                              // remove whitespace directly before commas
            .replace(/(^|[\s\-\/(])(\p{L})/gu,                  // capitalise first letter of each word
                (match, before, letter) => before + letter.toUpperCase());
    }

    function getSection(text, sectionHeader, nextHeaders = []){
        const startIndex = text.indexOf(sectionHeader);

        if (startIndex === -1) { return "";}

        const contentStart = startIndex + sectionHeader.length;

        let endIndex = text.length;
        nextHeaders.forEach(header => {
            const index = text.indexOf(header, contentStart);

            if (index !== -1 && index < endIndex){ endIndex = index;}
        });

        return text.substring(contentStart, endIndex).trim();
    }

    // Finds a label anywhere in the text and returns the value after it (same line or next line).
    function getLineValue(text, label) {
        const match = text.match(new RegExp(label + "\\s*:?\\s*([^\\r\\n]*)", "i"));
        return match ? match[1].trim() : "";
    }

    function convertSAPText() {
        const text = sapInputRef.current.innerText;
        const originalHTML = sapInputRef.current.innerHTML;
        
        const siteDetailsSection = getSection(text, "SITE DETAILS", ["CONNECTION DETAILS"]);
        const connectionSection = getSection(text, "CONNECTION DETAILS - NEW CONNECTION", ["APPLICANT DETAILS"]);
        const electricianSection = getSection(text, "ELECTRICIAN DETAILS", ["ELECTRICITY BILL PAYER DETAILS"]);
        const applicantSection = getSection(text, "APPLICANT DETAILS", ["ELECTRICIAN DETAILS"]);

        //Email input
        const emailContent = emailText;

        //Details from email
        const workOrderNumber = getValue(emailContent, "Work order number:", "Subject:");
        const fullSubject = getValue(emailContent, "Subject:", "Work order status:");
        const parts = fullSubject.split("-");
        const subject = parts.slice(0, 3).join("-");
        const icpNumber = getValue(emailContent, "ICP number:", "END");

        //Details from SAP
        const jobClassification = getValue(text, "Network Ready Job Classification:", ["Permanent/Temporary:", "SITE DETAILS"]);
        const permanent = getValue(text, "Permanent/Temporary:", "SITE DETAILS");

        const siteAddress = getValue(siteDetailsSection, "Site Address:", ["Legal Description:", "Additional Details"]);
        const titleAddress = formatAddress(siteAddress);
        const legalDescription = getValue(siteDetailsSection, "Legal Description:", "Additional Details:");
        const additionalDetails = getValue(siteDetailsSection, "Additional Details:", "Meter Number");

        const phasesRequired = getValue(connectionSection, "Phases Required:",["Load Demand:", "Required"]);
        const loadDemand = getValue(connectionSection, "Load Demand:","BTS Installation Details:");
        let assetType = getValue(connectionSection, "Asset Type:","Asset Number:");
        const assetNumber = getValue(connectionSection, "Asset Number:","Transformer Site ID:");
        const transformerSite = getValue(connectionSection, "Transformer Site ID:","High Level Job Scope:");
        const jobScope = getValue(connectionSection, "High Level Job Scope:","Land Description:");
        const landDescription = getValue(connectionSection, "Land Description:","Comments:");
        const comments = getValue(connectionSection, "Comments:");

        const electricianCompany = getValue(electricianSection, "Company:", "Name:");
        const electricianName = getValue(electricianSection, "Name:", "Phone:");
        const electricianPhone = formatPhone(getValue(electricianSection, "Phone:", "Email:"));
        const electricianEmail = getValue(electricianSection, "Email:", "Nominated Inspector/Meter Installer:");
        const inspector = getValue(electricianSection, "Nominated Inspector/Meter Installer:", "END");

        const applicantCompany = getValue(applicantSection, "Company:", "Name:");
        const applicantName = getValue(applicantSection, "Name:", "Phone:");
        const applicantPhone = formatPhone(getValue(applicantSection, "Phone:", "Email:"));
        const applicantEmail = getValue(applicantSection, "Email:", "Nominated Inspector/Meter Installer:");
        const applicantInspector = getValue(applicantSection, "Nominated Inspector/Meter Installer:", "END");

        const projectManagerName = getLineValue(text, "Project Manager Name");

        const isDecommission = jobClassification.toLowerCase().includes("decommission");
        const isTemporary = permanent.toLowerCase().includes("temp");
        const normalizedJobClassification = (jobClassification || "").trim();
        let displayJobClassification = normalizedJobClassification;

        if (isTemporary) {
            displayJobClassification = "BTS Connection";
        } else if (normalizedJobClassification.toLowerCase() === "new icp") {
            displayJobClassification = "New Connection";
        } else if (normalizedJobClassification.toLowerCase() === "modify icp") {
            displayJobClassification = "Modify Connection";
        }
        const normalizedAssetType = (assetType || "").trim();
        const normalizedAssetNumber = (assetNumber || "").trim();
        const assetTypeMissing = !normalizedAssetType || normalizedAssetType.toLowerCase() === "transformer";
        const assetNumberMissing = !normalizedAssetNumber;

        const electricianDetailsMissing = ![electricianCompany, electricianName, electricianPhone, electricianEmail, inspector]
            .some(value => value?.trim());
        const displayCompany = electricianDetailsMissing ? applicantCompany : electricianCompany;
        const displayName = electricianDetailsMissing ? applicantName : electricianName;
        const displayPhone = electricianDetailsMissing ? applicantPhone : electricianPhone;
        const displayEmail = electricianDetailsMissing ? applicantEmail : electricianEmail;
        const displayInspector = electricianDetailsMissing ? applicantInspector : inspector;
        const displaySectionTitle = electricianDetailsMissing ? "APPLICANT DETAILS - Electrician Details Missing" : "ELECTRICIAN DETAILS";

        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        const formattedDate = String(dueDate.getDate()).padStart(2, "0") + "/" + String(dueDate.getMonth() + 1).padStart(2, "0") + "/" + dueDate.getFullYear();

        //Formatted output
        const phaseText = {
            one: "Single phase",
            two: "Two phase",
            three: "Three phase"
        }[phasesRequired.toLowerCase()] || phasesRequired;

        const headerBlock = [
            `<div>${workOrderNumber} ${subject}-${titleAddress}</div>`,
            `<div>4100000590</div>`,
            `<div style="text-align:center;">
                <span style="font-weight:bold; text-decoration: underline; font-size:10pt;">
                    ${workOrderNumber} - ${titleAddress || legalDescription} - ${displayJobClassification}
                </span>
            </div>`
        ].join("");

        const contactLines = (company, name, phone, email) => [
            addLine("Company", company),
            addLine("Name", name),
            addLine("Phone", phone),
            addLine("Email", email)
        ];

        // Each entry is one section; SECTION_GAP is inserted between them.
        const sections = isDecommission ? [
            headerBlock,
            renderSection(null, [
                `${jobClassification} ${icpNumber}`,
                `${assetType} ${assetNumber}`,
                `Transformer Site ID ${transformerSite}`,
                `Site address: ${siteAddress}`,
                addLine("Additional Details", additionalDetails),
                `High level job scope: ${jobScope}`
            ]),
            renderSection("ELECTRICIAN DETAILS",
                contactLines(displayCompany, displayName, displayPhone, displayEmail)),
            renderSection("Applicant Details",
                contactLines(applicantCompany, applicantName, applicantPhone, applicantEmail))
        ] : [
            headerBlock,
            renderSection(null, [
                `${jobClassification} ${icpNumber}`,
                `${phaseText} ${loadDemand}A`,
                `Permanent/Temporary: ${permanent}`,
                `Asset Type: ${assetType === "Pillar" ? "Pillar Box" : assetType} ${assetNumber}`,
                `Transformer Site ID ${transformerSite}`
            ]),
            renderSection("Service Cable Size:", [
                assetTypeMissing ? "<strong>Asset missing</strong>" : "",
                assetNumberMissing ? "<strong>Asset number missing</strong>" : ""
            ]),
            renderSection("SITE DETAILS", [
                addLine("Site Address", siteAddress),
                addLine("Legal Description", legalDescription),
                addLine("Additional Details", additionalDetails)
            ]),
            renderSection("CONNECTION DETAILS - NEW CONNECTION", [
                addLine("Phases Required", phasesRequired),
                addLine("Load Demand", loadDemand),
                assetType === "Transformer" ? "" : addLine(
                    assetType === "Pillar" ? "Pillar Box#" : assetType + "#",
                    assetNumber),
                addLine("Transformer Site ID", transformerSite),
                addLine("High Level Job Scope", jobScope),
                addLine("Land Description", landDescription),
                addLine("Comments", comments)
            ]),
            renderSection(displaySectionTitle,
                contactLines(displayCompany, displayName, displayPhone, displayEmail)),
            renderSection("APPLICANT DETAILS",
                contactLines(applicantCompany, applicantName, applicantPhone, applicantEmail))
        ];

        const projectManagerSection = renderSection(null, [addLine("Project Manager Name", projectManagerName)]);
        const output = [...sections, projectManagerSection].filter(Boolean).join(SECTION_GAP);

        setOutputHtml(output);
    }

    async function copyOutput() {
        const temp = document.createElement("div");
        temp.innerHTML = outputHtml;
        await navigator.clipboard.write([
            new ClipboardItem({
                "text/html": new Blob([outputHtml], {type: "text/html"}),
                "text/plain": new Blob([temp.innerText], {type: "text/plain"})
            })
        ]);

        if (clearInputsOnCopy) {
            if (sapInputRef.current) {
                sapInputRef.current.innerHTML = "";
                sapInputRef.current.textContent = "";
            }
            setEmailText("");
        }
    }

    return (
        <>
            <h1>Network Ready Formatter</h1>

            <div className="inputBoxes">
                <div ref={sapInputRef} className="GW-input" contentEditable suppressContentEditableWarning/>

                <textarea placeholder= "WO Email Text" value={emailText}
                    onChange={(e) =>
                        setEmailText(
                            e.target.value
                        )
                    }
                />
            </div>

            <div className= "centered-buttons-div">
                <button onClick={convertSAPText}>Convert</button>
                <button onClick={copyOutput}>Copy Output</button>
            </div>
            <div className="centered-buttons-div">
                <label style={{ marginTop: "12px", marginBottom: "12px" }}>
                    <input
                        type="checkbox"
                        checked={clearInputsOnCopy}
                        onChange={(e) => setClearInputsOnCopy(e.target.checked)}
                    />
                    Clear input boxes after copy
                </label>
            </div>

            <div className="output" dangerouslySetInnerHTML={{__html:outputHtml}}/>
        </>
    );
}

export default NRFormatter;