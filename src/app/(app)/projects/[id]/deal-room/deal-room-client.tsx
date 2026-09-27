"use client";

import { useState } from "react";
import { saveProjectDocs, createInvoiceFromDealRoom } from "@/lib/deal-room-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DealRoomClient({ project }: { project: any }) {
  const router = useRouter();
  const [docType, setDocType] = useState<"proposal" | "contract" | "invoice">("proposal");
  const [loading, setLoading] = useState(false);

  const [proposal, setProposal] = useState(project.proposalData || {
    client: project.client.company,
    preparedBy: project.projectOwner.name,
    date: new Date().toISOString().slice(0, 10),
    title: project.name,
    platform: "Web & Mobile",
    timeline: "8 Weeks",
    budget: project.contractValue,
    overview: project.description || "We propose to build the application described below.",
    features: (project.scope ? project.scope.split("\n") : []).length > 1 ? project.scope.split("\n") : ['Real-time chat / core interaction layer','Task, notes & reminder management','Push notifications (FCM + APNs)','Secure authentication (Email + Google OAuth)'],
    milestones: project.milestones?.length > 0 ? project.milestones.map((m: any) => ({
      name: m.name,
      pct: Math.round((m.paymentAmount / project.contractValue) * 100),
      desc: m.deliverables || ""
    })) : [
      {name:'Advance / Kickoff',pct:25,desc:'Project kickoff, requirements sign-off, environment setup'},
      {name:'Milestone 1',pct:25,desc:'Core system & primary feature build'},
      {name:'Milestone 2',pct:25,desc:'Feature completion & integrations'},
      {name:'Final Payment',pct:25,desc:'Pre-delivery, testing sign-off & handover'}
    ]
  });

  const [contract, setContract] = useState(project.contractData || {
    client: project.client.company,
    clientRep: project.client.primaryContactName,
    agency: "StackTribe",
    date: new Date().toISOString().slice(0, 10),
    effective: new Date().toISOString().slice(0, 10),
    title: project.name,
    warrantyDays: "30",
    noticeDays: "15",
    jurisdiction: "Vadodara, Gujarat, India",
    total: project.contractValue,
    clauses: [
      {t:'Purpose & Objective', added:false, on:true, x:'This Agreement defines the terms, deliverables, payment schedule, IP transfer, warranties, support, confidentiality and dispute resolution for the design, development and delivery of the Project described herein.'},
      {t:'Scope of Services', added:false, on:true, x:'The Developer will provide end-to-end services covering planning & discovery, design, development, QA/testing, deployment, documentation and handover, as detailed in the Scope of Work section.'},
      {t:'Payment Schedule', added:false, on:true, x:'Payment is due per the milestone schedule below. Work on the next milestone pauses if a prior milestone payment is more than the agreed grace period overdue.'},
      {t:'Intellectual Property', added:false, on:true, x:'Ownership of the deliverables transfers to the Client upon full and final payment. Until then, all work product remains the property of the Developer.'},
      {t:'Confidentiality', added:false, on:true, x:'Both parties shall keep confidential all non-public information disclosed by the other party during this engagement, during the term and for 12 months after.'},
      {t:'Warranty & Support', added:false, on:true, x:'The Developer provides a bug-fix warranty period as stated in the Deliverables section, covering defects against the agreed scope only. New features requested after delivery are handled as Change Requests.'},
      {t:'Change Requests', added:false, on:true, x:'Any work outside the agreed scope is estimated and quoted separately, and requires the Client’s written approval before work begins.'},
      {t:'Termination', added:false, on:true, x:'Either party may terminate this Agreement with written notice per the notice period stated below. Work completed to date, and any milestone already due, remains payable.'},
      {t:'Third-Party Costs', added:false, on:true, x:'Hosting, domain, API, app-store and other third-party or console charges are the sole responsibility of the Client unless expressly included in the quoted price.'},
      {t:'Dispute Resolution', added:false, on:true, x:'The parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, the dispute shall be referred per the governing law and jurisdiction stated below.'},
      {t:'Force Majeure', added:true, on:true, x:'Neither party is liable for delay or failure to perform caused by events beyond its reasonable control, including natural disaster, internet/infrastructure outage, or government action.'},
      {t:'Limitation of Liability', added:true, on:true, x:'The Developer’s total liability under this Agreement is capped at the total fees paid by the Client. Neither party is liable for indirect, incidental or consequential damages.'},
      {t:'Data Protection & Privacy', added:true, on:true, x:'Any personal data processed while performing this Agreement is handled in accordance with applicable data protection law, used solely for the purposes of the Project, and not shared with third parties without consent.'},
      {t:'Non-Solicitation', added:true, on:true, x:'During the engagement and for 6 months after, neither party shall directly solicit for hire the other party’s personnel or subcontractors engaged on this Project, without written consent.'},
      {t:'Assignment', added:true, on:true, x:'Neither party may assign this Agreement to a third party without the other party’s prior written consent, except in connection with a merger, acquisition or sale of substantially all assets.'},
      {t:'Entire Agreement & Amendments', added:true, on:true, x:'This Agreement, together with its Appendices, constitutes the entire understanding between the parties and supersedes all prior discussions. Amendments are valid only if made in writing and signed by both parties.'}
    ]
  });

  const [invoice, setInvoice] = useState({
    invNo: `STB-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().slice(0, 10),
    client: project.client.company,
    clientEmail: project.client.primaryContactEmail,
    clientPhone: project.client.primaryContactPhone || "",
    items: project.milestones?.length > 0 ? project.milestones.map((m: any) => ({
      desc: m.name, qty: 1, cost: m.paymentAmount
    })) : [
      {desc:'Advance / Milestone 1',qty:1,cost:10000},
      {desc:'Development',qty:1,cost:20000},
      {desc:'Final Handover',qty:1,cost:10000}
    ],
    upi: "nimesh.rj17@okicici",
    acc: "2747882437",
    ifsc: "KKBK0002748",
    accName: "Nimesh Ranjan",
    address: "G-403 Kaavyaratna by Sanskruti, Randesan, Gandhinagar",
    email: "stacktribe.builds@gmail.com",
    phone: "+91 6355603994"
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveProjectDocs(project.id, proposal, contract);
      if (docType === "invoice") {
        await createInvoiceFromDealRoom(project.id, invoice, invoice.items);
      }
      toast.success("Saved successfully");
      router.refresh();
    } catch (e) {
      toast.error("Error saving document");
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const money = (n: any) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN');
  const invoiceTotal = invoice.items.reduce((s:number, it:any) => s + (Number(it.qty) * Number(it.cost)), 0);

  return (
    <div className="st-dealroom-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
        .st-dealroom-wrapper {
          --navy: #1a2456; --navy2: #243073; --coral: #ff6b5b; --violet: #8b5cf6;
          --ink: #171a2e; --paper: #ffffff; --line: #e4e2f5; --muted: #6b6f8c; --bg: #f4f3fb;
          font-family: 'Inter', system-ui, sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100vh;
        }
        .st-dealroom-wrapper h1, .st-dealroom-wrapper h2, .st-dealroom-wrapper h3, .st-dealroom-wrapper .brand {
          font-family: 'Space Grotesk', sans-serif;
        }
        .st-dr-header {
          background: linear-gradient(120deg, var(--navy) 0%, var(--navy2) 45%, #c23a6b 78%, var(--coral) 100%);
          color: #fff; padding: 22px 24px; position: relative; overflow: hidden;
        }
        .st-dr-header::before {
          content: ""; position: absolute; inset: 0;
          background: radial-gradient(circle at 15% 20%, rgba(139,92,246,.35), transparent 40%),
                      radial-gradient(circle at 85% 80%, rgba(255,107,91,.3), transparent 45%);
        }
        .st-dr-brand { font-size: 26px; letter-spacing: 2px; font-weight: 700; }
        .st-dr-tagline { font-size: 11.5px; opacity: .8; letter-spacing: .5px; margin-top: 2px; }
        .st-dr-roomtitle { font-size: 14px; opacity: .85; text-align: right; }
        .st-dr-tabs { display: flex; gap: 6px; margin-top: 16px; position: relative; flex-wrap: wrap; }
        .st-dr-tabs button {
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); color: #fff;
          padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: pointer; font-weight: 500;
        }
        .st-dr-tabs button.active { background: #fff; color: var(--navy); border-color: #fff; }
        .st-dr-layout { display: grid; grid-template-columns: 380px 1fr; gap: 0; min-height: calc(100vh - 150px); }
        @media (max-width: 880px) { .st-dr-layout { grid-template-columns: 1fr; } }
        .st-dr-formpanel { background: var(--paper); padding: 20px; border-right: 1px solid var(--line); overflow-y: auto; }
        .st-dr-previewwrap { padding: 24px; display: flex; justify-content: center; }
        .st-dr-field { margin-bottom: 12px; }
        .st-dr-field label { display: block; font-size: 11.5px; color: var(--muted); margin-bottom: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
        .st-dr-field input, .st-dr-field textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; font-family: inherit; font-size: 13.5px; background: #fbfbfe; }
        .st-dr-field textarea { resize: vertical; min-height: 44px; }
        .st-dr-section-h { font-size: 13px; font-weight: 700; color: var(--navy); margin: 18px 0 8px; padding-top: 12px; border-top: 1px solid var(--line); }
        .st-dr-row { display: flex; gap: 8px; }
        .st-dr-row .st-dr-field { flex: 1; }
        .st-dr-listitem { border: 1px solid var(--line); border-radius: 10px; padding: 10px; margin-bottom: 8px; background: #fbfbfe; }
        .st-dr-listitem .rm { float: right; background: none; border: none; color: #c23a6b; cursor: pointer; font-size: 12px; font-weight: 600; padding:0; }
        .st-dr-addbtn { width: 100%; padding: 9px; border: 1.5px dashed var(--violet); color: var(--violet); background: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 12.5px; }
        .st-dr-doc { background: #fff; width: 100%; max-width: 760px; box-shadow: 0 6px 30px rgba(26,36,86,.12); border-radius: 4px; overflow: hidden; }
        .st-dr-doc-cover { background: linear-gradient(135deg, var(--navy) 0%, #3a2a7a 50%, #c23a6b 85%, var(--coral) 100%); color: #fff; padding: 46px 40px; position: relative; overflow: hidden; }
        .st-dr-doc-cover::before { content: ""; position: absolute; left: -60px; top: -60px; width: 220px; height: 220px; border-radius: 50%; border: 14px solid rgba(255,255,255,.12); }
        .st-dr-doc-cover::after { content: ""; position: absolute; left: -30px; top: -30px; width: 150px; height: 150px; border-radius: 50%; border: 10px solid rgba(255,255,255,.15); }
        .st-dr-doc-cover .b { font-family: 'Space Grotesk', sans-serif; font-size: 13px; letter-spacing: 3px; opacity: .75; }
        .st-dr-doc-cover h1 { font-size: 28px; margin: 14px 0 4px; position: relative; font-weight: 700; }
        .st-dr-doc-cover .sub { opacity: .85; font-size: 13.5px; position: relative; }
        .st-dr-doc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-top: 22px; font-size: 12.5px; position: relative; }
        .st-dr-doc-meta b { opacity: .7; font-weight: 500; display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; }
        .st-dr-doc-body { padding: 34px 40px 44px; }
        .st-dr-doc-body h2 { font-size: 15px; color: var(--navy); border-bottom: 2px solid var(--coral); display: inline-block; padding-bottom: 3px; margin: 26px 0 10px; font-weight: 700; }
        .st-dr-doc-body h2:first-child { margin-top: 0; }
        .st-dr-doc-body p { font-size: 13px; line-height: 1.6; color: #333; margin: 6px 0; }
        .st-dr-doc-body ul { margin: 6px 0; padding-left: 20px; font-size: 13px; line-height: 1.55; color: #333; list-style-type: disc; }
        .st-dr-doc-body table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 8px 0; }
        .st-dr-doc-body th { background: var(--navy); color: #fff; text-align: left; padding: 7px 9px; font-weight: 600; }
        .st-dr-doc-body td { padding: 7px 9px; border-bottom: 1px solid var(--line); }
        .st-dr-doc-body tr:nth-child(even) td { background: #f7f6fc; }
        .st-dr-clausebox { border: 1px solid var(--line); border-radius: 8px; padding: 5px 12px; margin-bottom: 5px; cursor: pointer; }
        .st-dr-clausebox.off { opacity: .35; }
        .st-dr-clausebox .ct { font-size: 12.5px; font-weight: 600; display: flex; justify-content: space-between; }
        .st-dr-tag-added { display: inline-block; background: #e9f7ee; color: #1e7d42; font-size: 9.5px; font-weight: 700; padding: 1px 7px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
        .st-dr-foot-strip { background: var(--ink); color: #fff; padding: 14px 40px; font-size: 11px; display: flex; justify-content: space-between; opacity: .85; }
        
        @media print {
          body * { visibility: hidden; }
          .st-dealroom-wrapper, .st-dealroom-wrapper * { visibility: visible; }
          .st-dr-header, .st-dr-formpanel, .st-dr-tabs, .st-dr-actions { display: none !important; }
          .st-dr-layout { display: block; }
          .st-dr-previewwrap { padding: 0; position: absolute; left: 0; top: 0; width: 100%; }
          .st-dr-doc { box-shadow: none; max-width: 100%; }
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />

      {/* HEADER */}
      <header className="st-dr-header">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <div className="st-dr-brand">STACK TRIBE</div>
            <div className="st-dr-tagline">here we build exotic softwares</div>
          </div>
          <div className="st-dr-roomtitle">Client Deal Room<br/>Proposal · Contract · Invoice, one place</div>
        </div>
        <nav className="st-dr-tabs">
          {(["proposal", "contract", "invoice"] as const).map(t => (
            <button key={t} onClick={() => setDocType(t)} className={docType === t ? "active" : ""}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {/* MAIN */}
      <main className="st-dr-layout">
        
        {/* FORM */}
        <section className="st-dr-formpanel flex flex-col">
          {docType === "proposal" && (
            <div>
              <div className="st-dr-section-h">Proposal Header</div>
              <div className="st-dr-field"><label>Client Name</label><input value={proposal.client} onChange={e => setProposal({...proposal, client: e.target.value})} /></div>
              <div className="st-dr-field"><label>Prepared By</label><input value={proposal.preparedBy} onChange={e => setProposal({...proposal, preparedBy: e.target.value})} /></div>
              <div className="st-dr-field"><label>Date</label><input type="date" value={proposal.date} onChange={e => setProposal({...proposal, date: e.target.value})} /></div>
              <div className="st-dr-field"><label>Project Title</label><input value={proposal.title} onChange={e => setProposal({...proposal, title: e.target.value})} /></div>
              <div className="st-dr-field"><label>Platform</label><input value={proposal.platform} onChange={e => setProposal({...proposal, platform: e.target.value})} /></div>
              <div className="st-dr-row">
                <div className="st-dr-field"><label>Timeline</label><input value={proposal.timeline} onChange={e => setProposal({...proposal, timeline: e.target.value})} /></div>
                <div className="st-dr-field"><label>Budget (Rs.)</label><input type="number" value={proposal.budget} onChange={e => setProposal({...proposal, budget: e.target.value})} /></div>
              </div>
              <div className="st-dr-field"><label>Overview</label><textarea value={proposal.overview} onChange={e => setProposal({...proposal, overview: e.target.value})} /></div>
              
              <div className="st-dr-section-h">Key Features</div>
              {proposal.features.map((f:any, i:number) => (
                <div key={i} className="st-dr-listitem">
                  <button className="rm" onClick={() => setProposal({...proposal, features: proposal.features.filter((_:any,idx:number)=>idx!==i)})}>remove</button>
                  <textarea style={{width:'100%', border:'none', background:'none', fontSize:'12.5px', outline:'none', resize:'none'}} value={f} onChange={e => {const nf=[...proposal.features]; nf[i]=e.target.value; setProposal({...proposal, features:nf})}} />
                </div>
              ))}
              <button className="st-dr-addbtn" onClick={() => setProposal({...proposal, features: [...proposal.features, "New feature"]})}>+ Add feature</button>
              
              <div className="st-dr-section-h">Milestones & Payment</div>
              {proposal.milestones.map((m:any, i:number) => (
                <div key={i} className="st-dr-listitem">
                  <button className="rm" onClick={() => setProposal({...proposal, milestones: proposal.milestones.filter((_:any,idx:number)=>idx!==i)})}>remove</button>
                  <input style={{width:'60%', border:'none', background:'none', fontWeight:600, fontSize:'12.5px', outline:'none'}} value={m.name} onChange={e => {const nm=[...proposal.milestones]; nm[i].name=e.target.value; setProposal({...proposal, milestones:nm})}} />
                  <input type="number" style={{width:'20%', border:'none', background:'none', textAlign:'right', fontSize:'12.5px', outline:'none'}} value={m.pct} onChange={e => {const nm=[...proposal.milestones]; nm[i].pct=e.target.value; setProposal({...proposal, milestones:nm})}} />%
                  <textarea style={{width:'100%', border:'none', background:'none', fontSize:'12px', marginTop:'4px', outline:'none'}} value={m.desc} onChange={e => {const nm=[...proposal.milestones]; nm[i].desc=e.target.value; setProposal({...proposal, milestones:nm})}} />
                </div>
              ))}
              <button className="st-dr-addbtn" onClick={() => setProposal({...proposal, milestones: [...proposal.milestones, {name:'New Milestone', pct:0, desc:''}]})}>+ Add milestone</button>
            </div>
          )}

          {docType === "contract" && (
            <div>
              <div className="st-dr-section-h">Parties</div>
              <div className="st-dr-field"><label>Client (Company)</label><input value={contract.client} onChange={e => setContract({...contract, client: e.target.value})} /></div>
              <div className="st-dr-field"><label>Client Rep</label><input value={contract.clientRep} onChange={e => setContract({...contract, clientRep: e.target.value})} /></div>
              <div className="st-dr-field"><label>Agency</label><input value={contract.agency} onChange={e => setContract({...contract, agency: e.target.value})} /></div>
              <div className="st-dr-row">
                <div className="st-dr-field"><label>Date</label><input type="date" value={contract.date} onChange={e => setContract({...contract, date: e.target.value})} /></div>
                <div className="st-dr-field"><label>Effective Date</label><input type="date" value={contract.effective} onChange={e => setContract({...contract, effective: e.target.value})} /></div>
              </div>
              <div className="st-dr-field"><label>Project Title</label><input value={contract.title} onChange={e => setContract({...contract, title: e.target.value})} /></div>
              <div className="st-dr-row">
                <div className="st-dr-field"><label>Warranty (days)</label><input value={contract.warrantyDays} onChange={e => setContract({...contract, warrantyDays: e.target.value})} /></div>
                <div className="st-dr-field"><label>Notice (days)</label><input value={contract.noticeDays} onChange={e => setContract({...contract, noticeDays: e.target.value})} /></div>
              </div>
              <div className="st-dr-field"><label>Jurisdiction</label><input value={contract.jurisdiction} onChange={e => setContract({...contract, jurisdiction: e.target.value})} /></div>
              <div className="st-dr-field"><label>Total Contract Value (Rs.)</label><input type="number" value={contract.total} onChange={e => setContract({...contract, total: e.target.value})} /></div>
              
              <div className="st-dr-section-h">Clauses (toggle on/off)</div>
              {contract.clauses.map((cl:any, i:number) => (
                <div key={i} className={`st-dr-clausebox ${cl.on ? '' : 'off'}`}>
                  <div className="ct" onClick={() => {const nc=[...contract.clauses]; nc[i].on=!nc[i].on; setContract({...contract, clauses:nc})}}>
                    <span>{cl.t}{cl.added && <span className="st-dr-tag-added">Added</span>}</span>
                    <span>{cl.on ? '✓' : 'off'}</span>
                  </div>
                  <textarea style={{width:'100%', border:'none', background:'none', fontSize:'11.5px', color:'#555', outline:'none'}} value={cl.x} onChange={e=>{const nc=[...contract.clauses]; nc[i].x=e.target.value; setContract({...contract, clauses:nc})}} />
                </div>
              ))}
            </div>
          )}

          {docType === "invoice" && (
            <div>
              <div className="st-dr-section-h">Invoice Header</div>
              <div className="st-dr-field"><label>Invoice No.</label><input value={invoice.invNo} onChange={e => setInvoice({...invoice, invNo: e.target.value})} /></div>
              <div className="st-dr-field"><label>Date</label><input type="date" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} /></div>
              <div className="st-dr-field"><label>Client Name</label><input value={invoice.client} onChange={e => setInvoice({...invoice, client: e.target.value})} /></div>
              <div className="st-dr-row">
                <div className="st-dr-field"><label>Client Email</label><input value={invoice.clientEmail} onChange={e => setInvoice({...invoice, clientEmail: e.target.value})} /></div>
                <div className="st-dr-field"><label>Client Phone</label><input value={invoice.clientPhone} onChange={e => setInvoice({...invoice, clientPhone: e.target.value})} /></div>
              </div>
              
              <div className="st-dr-section-h">Line Items</div>
              {invoice.items.map((it:any, i:number) => (
                <div key={i} className="st-dr-listitem">
                  <button className="rm" onClick={() => setInvoice({...invoice, items: invoice.items.filter((_:any,idx:number)=>idx!==i)})}>remove</button>
                  <input style={{width:'100%', border:'none', background:'none', fontSize:'12.5px', fontWeight:600, outline:'none'}} value={it.desc} onChange={e => {const ni=[...invoice.items]; ni[i].desc=e.target.value; setInvoice({...invoice, items:ni})}} />
                  <div className="st-dr-row" style={{marginTop:'4px', fontSize:'12px'}}>
                    <input type="number" style={{border:'none', background:'none', fontSize:'12px', width:'50px', outline:'none'}} value={it.qty} onChange={e => {const ni=[...invoice.items]; ni[i].qty=Number(e.target.value); setInvoice({...invoice, items:ni})}} /> qty ×
                    <input type="number" style={{border:'none', background:'none', fontSize:'12px', width:'80px', outline:'none'}} value={it.cost} onChange={e => {const ni=[...invoice.items]; ni[i].cost=Number(e.target.value); setInvoice({...invoice, items:ni})}} /> Rs.
                  </div>
                </div>
              ))}
              <button className="st-dr-addbtn" onClick={() => setInvoice({...invoice, items: [...invoice.items, {desc:'New item', qty:1, cost:0}]})}>+ Add line item</button>
              
              <div className="st-dr-section-h">Payment Details</div>
              <div className="st-dr-field"><label>UPI ID</label><input value={invoice.upi} onChange={e => setInvoice({...invoice, upi: e.target.value})} /></div>
              <div className="st-dr-field"><label>Account No.</label><input value={invoice.acc} onChange={e => setInvoice({...invoice, acc: e.target.value})} /></div>
              <div className="st-dr-field"><label>IFSC</label><input value={invoice.ifsc} onChange={e => setInvoice({...invoice, ifsc: e.target.value})} /></div>
              <div className="st-dr-field"><label>Account Holder</label><input value={invoice.accName} onChange={e => setInvoice({...invoice, accName: e.target.value})} /></div>
            </div>
          )}

          <div className="mt-auto pt-6 flex gap-2 st-dr-actions">
            <Button variant="outline" className="flex-1" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save to DB"}</Button>
            <Button className="flex-1" onClick={handlePrint}>Print / PDF</Button>
          </div>
        </section>

        {/* PREVIEW */}
        <section className="st-dr-previewwrap">
          <div className="st-dr-doc" id="preview">
            
            {docType === "proposal" && (
              <>
                <div className="st-dr-doc-cover">
                  <div className="b">STACK TRIBE · APPLICATION PROPOSAL</div>
                  <h1>{proposal.title || 'Project Proposal'}</h1>
                  <div className="sub">Prepared for {proposal.client || '[Client]'}</div>
                  <div className="st-dr-doc-meta">
                    <div><b>Platform</b>{proposal.platform}</div>
                    <div><b>Timeline</b>{proposal.timeline}</div>
                    <div><b>Prepared by</b>{proposal.preparedBy}</div>
                    <div><b>Date</b>{proposal.date}</div>
                    <div><b>Budget</b>{money(proposal.budget)}</div>
                    <div><b>Doc</b>Proposal v1</div>
                  </div>
                </div>
                <div className="st-dr-doc-body">
                  <h2>1. Project Overview</h2><p>{proposal.overview}</p>
                  <h2>2. Key Features</h2><ul>{proposal.features.map((f:any,i:number)=><li key={i}>{f}</li>)}</ul>
                  <h2>3. Milestones & Payment Schedule</h2>
                  <table>
                    <thead><tr><th>Milestone</th><th>Description</th><th>%</th><th>Amount</th></tr></thead>
                    <tbody>
                      {proposal.milestones.map((m:any,i:number)=> (
                        <tr key={i}><td>{m.name}</td><td>{m.desc}</td><td>{m.pct}%</td><td>{money(Number(proposal.budget)*Number(m.pct)/100)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <h2>4. Assumptions</h2><p>This estimate assumes stable, documented APIs and timely client feedback on reviews. Any change outside this scope is quoted separately via a Change Request before work begins.</p>
                </div>
                <div className="st-dr-foot-strip">
                  <span>stacktribe.dev · here we build exotic softwares</span>
                  <span>Valid for 14 days</span>
                </div>
              </>
            )}

            {docType === "contract" && (
              <>
                <div className="st-dr-doc-cover">
                  <div className="b">SOFTWARE DEVELOPMENT AGREEMENT</div>
                  <h1>{contract.title || 'Project Agreement'}</h1>
                  <div className="sub">{contract.agency} &amp; {contract.client || '[Client]'}</div>
                  <div className="st-dr-doc-meta">
                    <div><b>Client Rep.</b>{contract.clientRep}</div>
                    <div><b>Effective Date</b>{contract.effective || contract.date}</div>
                    <div><b>Total Value</b>{money(contract.total)}</div>
                    <div><b>Jurisdiction</b>{contract.jurisdiction}</div>
                  </div>
                </div>
                <div className="st-dr-doc-body">
                  <h2>Parties</h2><p><b>Agency:</b> {contract.agency} &nbsp; <b>Client:</b> {contract.client} ({contract.clientRep})</p>
                  {contract.clauses.filter((c:any)=>c.on).map((cl:any, i:number)=>(
                    <div key={i}><h2>{i+1}. {cl.t}{cl.added && <span className="st-dr-tag-added">Added clause</span>}</h2><p>{cl.x}</p></div>
                  ))}
                  <h2>{contract.clauses.filter((c:any)=>c.on).length + 1}. Warranty Period</h2><p>A {contract.warrantyDays}-day bug-fix warranty applies from the date of final delivery/acceptance.</p>
                  <h2>{contract.clauses.filter((c:any)=>c.on).length + 2}. Termination Notice</h2><p>Either party may terminate with {contract.noticeDays} days' written notice, per the Termination clause above.</p>
                  <h2>{contract.clauses.filter((c:any)=>c.on).length + 3}. Signatures</h2>
                  <table>
                    <thead><tr><th>Party</th><th>Name</th><th>Signature</th><th>Date</th></tr></thead>
                    <tbody>
                      <tr><td>Agency</td><td>{contract.agency}</td><td style={{height:40}}></td><td></td></tr>
                      <tr><td>Client</td><td>{contract.clientRep}</td><td style={{height:40}}></td><td></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="st-dr-foot-strip">
                  <span>stacktribe.dev · Not legal advice — review with counsel before signature</span>
                  <span>{contract.date}</span>
                </div>
              </>
            )}

            {docType === "invoice" && (
              <>
                <div className="st-dr-doc-cover">
                  <div className="b">INVOICE</div>
                  <h1>{invoice.invNo}</h1>
                  <div className="sub">{invoice.date}</div>
                  <div className="st-dr-doc-meta">
                    <div><b>Invoice to</b>{invoice.client || '[Client]'}</div>
                    <div><b>Contact</b>{invoice.clientEmail} {invoice.clientPhone}</div>
                  </div>
                </div>
                <div className="st-dr-doc-body">
                  <table>
                    <thead><tr><th>Description</th><th>Qty</th><th>Cost</th><th>Subtotal</th></tr></thead>
                    <tbody>
                      {invoice.items.map((it:any,i:number)=>(
                        <tr key={i}><td>{it.desc}</td><td>{it.qty}</td><td>{money(it.cost)}</td><td>{money(it.qty * it.cost)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <h2 style={{border:'none', float:'right'}}>Total: {money(invoiceTotal)}</h2><div style={{clear:'both'}}></div>
                  <h2>Payment Details</h2><p>UPI: {invoice.upi} &nbsp;|&nbsp; A/c: {invoice.acc} &nbsp;|&nbsp; IFSC: {invoice.ifsc} &nbsp;|&nbsp; Name: {invoice.accName}</p>
                </div>
                <div className="st-dr-foot-strip">
                  <span>{invoice.address || ''} · {invoice.email}</span>
                  <span>{invoice.phone}</span>
                </div>
              </>
            )}

          </div>
        </section>
      </main>
    </div>
  );
}
