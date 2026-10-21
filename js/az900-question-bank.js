export const AZ900_AREAS = [
    {
        name: "Describe Cloud Concepts",
        topics: [
            ["What Is Cloud Computing?", "What is cloud computing?", "Using computing services delivered over the internet", ["Buying a physical server for every user", "Using only software installed from a DVD", "Connecting computers only through a local network"]],
            ["Benefits of Cloud Computing", "Which cloud benefit lets an organization increase or reduce resources as demand changes?", "Elasticity", ["Capital expenditure", "Manual provisioning", "Data residency"]],
            ["Cloud Computing Models — Public, Private, and Hybrid", "A company keeps sensitive workloads in its own datacenter and uses Azure for other workloads. Which model is this?", "Hybrid cloud", ["Public cloud", "Private cloud", "Community cloud"]],
            ["Cloud Service Types — IaaS, PaaS, and SaaS", "Which cloud service type gives you the most control over the operating system and virtual machines?", "Infrastructure as a Service (IaaS)", ["Software as a Service (SaaS)", "Platform as a Service (PaaS)", "Function as a Service (FaaS)"]],
            ["Shared Responsibility Model", "In the shared responsibility model, who is responsible for classifying the data a customer stores in a cloud service?", "The customer", ["The cloud provider only", "The internet service provider", "The hardware manufacturer"]],
            ["Consumption-Based Model", "What is a common characteristic of the consumption-based model?", "You pay for the resources you use", ["You must buy all planned capacity up front", "Every service has a fixed lifetime price", "Resources cannot be scaled after purchase"]],
            ["High Availability and Scalability", "What does scalability describe?", "The ability to adjust capacity to meet changing workload demand", ["The ability to recover data from a backup only", "The geographic location of a datacenter", "The process of assigning user permissions"]],
            ["Reliability and Predictability", "Which cloud benefit helps an application continue operating after a component failure?", "Reliability", ["Governance", "Capitalization", "Authentication"]],
            ["Security and Governance in the Cloud", "Which practice helps ensure cloud resources follow an organization's rules?", "Apply governance policies and monitor compliance", ["Disable all resource monitoring", "Share administrator credentials", "Allow every user to create any resource"]]
        ]
    },
    {
        name: "Describe Azure Architecture and Services",
        topics: [
            ["Introduction to Microsoft Azure", "What is Microsoft Azure?", "Microsoft's cloud computing platform", ["A desktop operating system only", "A physical network cable standard", "A single database product"]],
            ["Azure Regions and Region Pairs", "Why does Azure pair some regions?", "To support certain disaster-recovery and platform-update scenarios", ["To make both regions share one subscription", "To guarantee that every service is deployed in both regions", "To remove the need for backups"]],
            ["Availability Zones", "What is an Azure availability zone?", "A physically separate datacenter location within an Azure region", ["A separate Microsoft Entra tenant", "A billing group for subscriptions", "A virtual network address range"]],
            ["Azure Resources and Resource Groups", "What is an Azure resource group used for?", "Grouping and managing related Azure resources", ["Storing only user passwords", "Connecting two Azure regions", "Replacing an Azure subscription"]],
            ["Azure Subscriptions and Management Groups", "What can a management group help you manage?", "Access, policies, and compliance across multiple subscriptions", ["A single virtual machine's operating system", "Only the files in one storage account", "The physical power supply for a datacenter"]],
            ["Azure Virtual Machines", "Which Azure service provides on-demand Windows or Linux virtual machines?", "Azure Virtual Machines", ["Azure Policy", "Microsoft Purview", "Azure DNS"]],
            ["Azure Virtual Networks", "What is the primary purpose of an Azure virtual network?", "Enabling private communication between Azure resources and other connected networks", ["Managing cloud invoices", "Creating user identities", "Scanning files for data classifications"]],
            ["Azure Storage Services", "Which Azure storage service is designed for large amounts of unstructured object data?", "Azure Blob Storage", ["Azure DNS", "Azure Functions", "Azure Bastion"]],
            ["Azure Databases", "Which Azure service is a managed relational database offering based on SQL Server?", "Azure SQL Database", ["Azure Blob Storage", "Azure Virtual Network", "Azure Monitor"]],
            ["Azure App Service", "What can you host with Azure App Service?", "Web apps and APIs without managing the underlying servers", ["A physical datacenter", "A local-only user directory", "An internet routing protocol"]],
            ["Azure Functions", "What is a key characteristic of Azure Functions?", "It runs code in response to events without requiring you to manage servers", ["It is a dedicated physical network appliance", "It is used only to create virtual machines", "It replaces Azure subscriptions"]],
            ["Azure Container Services", "What is a container useful for?", "Packaging an application with its dependencies for consistent deployment", ["Pairing Azure regions", "Setting a subscription spending limit", "Creating a hardware availability zone"]],
            ["Azure AI Services", "What do Azure AI services provide?", "Prebuilt APIs and tools for adding AI capabilities to applications", ["Only virtual network routing", "Only long-term file archiving", "A replacement for identity management"]],
            ["Azure IoT Services", "What is Azure IoT Hub designed to help manage?", "Secure communication between IoT devices and cloud solutions", ["Monthly billing exports only", "Desktop operating system updates only", "Resource group naming rules"]],
            ["Azure Virtual Desktop", "What does Azure Virtual Desktop deliver?", "Virtual desktops and remote applications", ["A hosted relational database", "A source control repository", "A cloud cost estimate"]],
            ["Azure Identity and Access Management", "What is identity and access management used for?", "Controlling who can authenticate and what they can access", ["Selecting a datacenter region", "Compressing stored files", "Calculating a service-level agreement"]],
            ["Microsoft Entra ID", "What is Microsoft Entra ID primarily used for?", "Cloud identity and access management", ["Managing virtual machine disks", "Creating Azure cost estimates", "Storing unstructured objects"]],
            ["Azure VPN Gateway and ExpressRoute", "Which connection uses a private, dedicated connection from an organization's network to Microsoft cloud services?", "ExpressRoute", ["Azure DNS", "Azure Load Testing", "Azure Functions"]]
        ]
    },
    {
        name: "Describe Azure Management and Governance",
        topics: [
            ["Azure Cost Management", "What can Azure Cost Management help you do?", "Analyze, monitor, and help control cloud spending", ["Assign DNS names to virtual machines", "Create user authentication tokens", "Deploy physical network cables"]],
            ["Azure Pricing Calculator", "When should you use the Azure pricing calculator?", "To estimate the cost of Azure products before deployment", ["To review actual past invoices only", "To assign role permissions", "To enforce resource naming rules"]],
            ["Azure Total Cost of Ownership (TCO) Calculator", "What does the Azure TCO Calculator help estimate?", "Potential cost savings from moving workloads to Azure", ["The number of user accounts in a tenant", "The latency between two virtual machines", "The time needed to update a resource"]],
            ["Microsoft Cost Management", "Which capability can help you receive an alert when spending reaches a configured threshold?", "Cost alerts", ["Availability zones", "Resource locks", "Azure DNS zones"]],
            ["Azure Tags", "What is a common use for Azure tags?", "Organizing resources and reporting costs by values such as department or project", ["Encrypting every network packet", "Creating a private connection to Azure", "Replacing resource groups"]],
            ["Azure Policy", "What can Azure Policy do?", "Audit or enforce organizational rules for resources", ["Restore a deleted user password", "Increase virtual machine memory automatically in every case", "Replace the Azure portal"]],
            ["Resource Locks", "What does a delete lock help prevent?", "Accidental deletion of a resource", ["Users from viewing resource properties", "A resource from generating metrics", "Billing records from being created"]],
            ["Microsoft Purview", "What is Microsoft Purview used to help manage?", "Data governance, discovery, and classification", ["Virtual machine processor allocation", "VPN tunnel encryption keys only", "Azure subscription payments"]],
            ["Azure Role-Based Access Control (RBAC)", "What does Azure RBAC use to control access to Azure resources?", "Role assignments at a defined scope", ["Region pairs", "Resource tags only", "Availability sets"]],
            ["Microsoft Defender for Cloud", "What does Microsoft Defender for Cloud help provide?", "Security posture management and threat protection recommendations", ["A cost estimate before deployment", "A directory of public IP addresses", "A source code compiler"]],
            ["Azure Service Level Agreements (SLAs)", "What does an Azure service-level agreement describe?", "Microsoft's commitments for service availability or connectivity", ["A customer's password requirements", "The exact cost of every future workload", "A list of all Azure regions"]],
            ["Azure Service Lifecycle", "Where can you find information about Azure product updates and retirement plans?", "The Azure service lifecycle documentation", ["A resource group's tags", "A virtual machine's operating system", "The pricing calculator only"]],
            ["Azure Portal", "What is the Azure portal?", "A web-based interface for managing Azure services", ["A physical network gateway", "A command-line shell that only runs locally", "A database query language"]],
            ["Azure Cloud Shell", "What is Azure Cloud Shell?", "A browser-accessible shell for managing Azure resources", ["A private availability zone", "A physical server rack", "An offline password vault"]],
            ["Azure CLI", "Which tool lets you manage Azure resources by running commands such as `az group list`?", "Azure CLI", ["Azure Pricing Calculator", "Microsoft Purview", "Azure Service Health"]],
            ["Azure PowerShell", "Which Azure management tool provides PowerShell cmdlets?", "Azure PowerShell", ["Azure Resource Graph only", "Azure Blob Storage", "Microsoft Defender Antivirus"]],
            ["Azure Arc", "What does Azure Arc help organizations do?", "Manage resources across on-premises, multicloud, and Azure environments", ["Convert every workload into a virtual machine", "Replace all cloud governance tools", "Guarantee zero cost for connected servers"]]
        ]
    }
];

export const AZ900_QUESTIONS = AZ900_AREAS.flatMap((area, areaIndex) =>
    area.topics.map(([topic, question, answer, distractors], topicIndex) => ({
        id: `${areaIndex}-${topicIndex}`,
        area: area.name,
        areaIndex,
        topic,
        topicIndex,
        question,
        answer,
        options: [answer, ...distractors],
        explanation: `This question checks the AZ-900 topic: ${topic}.`
    }))
);

export function questionsForTopic(value = "az900:all") {
    if (value === "az900:all" || value === "all") return AZ900_QUESTIONS;
    const areaMatch = value.match(/^area:(\d+)$/);
    if (areaMatch) return AZ900_QUESTIONS.filter(question => question.areaIndex === Number(areaMatch[1]));
    const topicMatch = value.match(/^topic:(\d+):(\d+)$/);
    if (topicMatch) return AZ900_QUESTIONS.filter(question => question.areaIndex === Number(topicMatch[1]) && question.topicIndex === Number(topicMatch[2]));
    return [];
}

export function labelForTopic(value) {
    if (value === "az900:all" || value === "all") return "All AZ-900 topics";
    const areaMatch = value.match(/^area:(\d+)$/);
    if (areaMatch) return AZ900_AREAS[Number(areaMatch[1])]?.name || "AZ-900";
    const topicMatch = value.match(/^topic:(\d+):(\d+)$/);
    if (topicMatch) return AZ900_AREAS[Number(topicMatch[1])]?.topics[Number(topicMatch[2])]?.[0] || "AZ-900";
    return value;
}
