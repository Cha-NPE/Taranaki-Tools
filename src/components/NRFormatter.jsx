import { useRef, useState } from "react";
import "./styles.css";

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
        const output =
        `
        <div>${workOrderNumber} ${subject}-${titleAddress}</div>
        <div>4100000590</div>

        <div style="text-align:center;">
            <span style="font-weight:bold; text-decoration: underline; font-size:10pt;">
                ${workOrderNumber} - ${titleAddress || legalDescription} - ${displayJobClassification}
            </span>
        </div>
        <div><br></div>
        <div>${jobClassification} ${icpNumber}</div>
        
        ${!isDecommission ? `
        <div>${({  
            one: "Single phase",
            two: "Two phase",
            three: "Three phase"
        }[phasesRequired.toLowerCase()] || phasesRequired)} ${loadDemand}A</strong></div>
        <div>Permanent/Temporary: ${permanent}</div>
        <div>Asset Type: ${
            assetType === "Pillar "
                ? "Pillar Box " + assetNumber
                : assetType + " " + assetNumber
        }</div>
        <div>Transformer Site ID ${transformerSite}</div>
        <div><br></div>
        <div><strong>\nService Cable Size:\n</strong></div>

        ${assetTypeMissing ? `<div><strong>Asset missing</strong></div>` : ``}
        ${assetNumberMissing ? `<div><strong>Asset number missing</strong></div>` : ``}
        ` : ``}
        ${isDecommission ? `
        <div>${assetType} ${assetNumber}</div>
        <div>Transformer Site ID ${transformerSite}</div>
        <div>Site address: ${siteAddress}</div>
        <div>${addLine("Additional Details", additionalDetails)}</div>
        <div>High level job scope: ${jobScope}</div>
        <br>
        <div>ELECTRICIAN DETAILS</strong></div>
        ` : `
        <div><br></div>
        <div><strong>SITE DETAILS</strong></div>
        <div>${addLine("Site Address", siteAddress)}</div>
        <div>${addLine("Legal Description", legalDescription)}</div>  
        <div>${addLine("Additional Details", additionalDetails)}</div>
        <div><strong>CONNECTION DETAILS - NEW CONNECTION</strong></div>
        <div>${addLine("Phases Required", phasesRequired)}</div>
        <div>${addLine("Load Demand", loadDemand)}</div>
        <div>${assetType === "Transformer" ? "" : addLine(
            assetType === "Pillar"
                ? "Pillar Box#"
                : assetType + "#",
            assetNumber)}</div>
        <div>${addLine("Transformer Site ID", transformerSite)}</div>
        <div>${addLine("High Level Job Scope", jobScope)}</div>
        <div>${addLine("Land Description", landDescription)}</div>
        <div>${addLine("Comments", comments)}</div>
        <div><br></div>
        <div><strong>${displaySectionTitle}</strong></div>
        `}
        <div>${addLine("Company", displayCompany)}</div>
        <div>${addLine("Name", displayName)}</div>
        <div>${addLine("Phone", displayPhone)}</div>
        <div>${addLine("Email", displayEmail)}</div>
        <div><br></div>
        <div>${addLine("APPLICANT DETAILS")}</div>
        <div>${addLine("Company", applicantCompany)}</div>
        <div>${addLine("Name", applicantName)}</div>
        <div>${addLine("Phone", applicantPhone)}</div>
        <div>${addLine("Email", applicantEmail)}</div>
        `

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