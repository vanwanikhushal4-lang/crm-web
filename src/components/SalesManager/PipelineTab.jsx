import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Download,
  Filter,
  Grid,
  List as ListIcon,
  ChevronDown,
  ChevronUp,
  X,
  Loader,
  PlusCircle,
  FileText,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Table
} from 'lucide-react';


import {
  getLeads,
  getAllCustomersByUserId,
  getAllCustomerDetails,
  getAllMomDetails,
  getAllProducts,
  getDesignations,
  saveOrUpdateLead,
  createNewDesignation,
  saveMoMDetailsOfCustomer
} from '../../api/apiFunctions/Login/Login_api_function';

export const parseBudgetToCr = (value) => {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  const str = String(value).toLowerCase().replace(/,/g, '');
  const numbers = str.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return 0;
  const avg = numbers.length > 1 ? (numbers[0] + numbers[1]) / 2 : numbers[0];
  if (str.includes('cr')) return avg;
  if (str.includes('lakh') || str.includes('lac') || str.includes(' l')) return avg / 100;
  if (avg >= 100000) return avg / 10000000;
  return avg;
};

export const formatCr = (value, emptyLabel = 'TBD') => {
  const number = Number(value || 0);
  if (!number) return emptyLabel;
  if (number >= 1) return `₹${number.toFixed(number >= 10 ? 0 : 1)} Cr`;
  if (number >= 0.01) return `₹${Math.round(number * 100)} L`;
  return `₹${Math.round(number * 10000000).toLocaleString('en-IN')}`;
};

export const getStageFromMom = (mom) => {
  const nextStep = String(mom?.outcome?.next_step || mom?.next_step || '').toLowerCase();
  const rawStage = Number(mom?.stage || mom?.finalStage || 1);

  if (nextStep.includes('lost') || nextStep.includes('reject') || nextStep.includes('not interested')) return 'LOST';
  if (nextStep.includes('won') || nextStep.includes('closed') || nextStep.includes('closure')) return 'WON';
  if (nextStep.includes('negotiation')) return 'NEGOTIATION';
  if (nextStep.includes('proposal') || nextStep.includes('commercial')) return 'PROPOSAL_SENT';
  if (nextStep.includes('demo') || nextStep.includes('poc') || nextStep.includes('qualified')) return 'QUALIFIED';
  if (nextStep.includes('technical') || nextStep.includes('discussion')) return 'TECH_DISCUSSION';
  
  const stageMap = {
    1: 'NEW_LEAD',
    2: 'CONTACTED',
    3: 'QUALIFIED',
    4: 'PROPOSAL_SENT',
    5: 'NEGOTIATION',
    6: 'WON',
    7: 'LOST'
  };
  return stageMap[rawStage] || 'NEW_LEAD';
};

export const getStageFromLead = (lead, fallbackMom) => {
  const raw = String(lead?.stage || lead?.leadStage || lead?.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const stageMap = {
    NEW: 'NEW_LEAD',
    NEW_LEAD: 'NEW_LEAD',
    INITIAL_CONTACT: 'NEW_LEAD',
    CONTACTED: 'CONTACTED',
    TECH_DISCUSSION: 'TECH_DISCUSSION',
    QUALIFIED: 'QUALIFIED',
    DEMO: 'QUALIFIED',
    PROPOSAL: 'PROPOSAL_SENT',
    PROPOSAL_SENT: 'PROPOSAL_SENT',
    NEGOTIATION: 'NEGOTIATION',
    WON: 'WON',
    LOST: 'LOST',
  };

  if (stageMap[raw]) return stageMap[raw];
  const numericStage = Number(lead?.stage || lead?.stageId || lead?.leadStageId);
  if (numericStage >= 1 && numericStage <= 7) {
    const numMap = {
      1: 'NEW_LEAD',
      2: 'CONTACTED',
      3: 'QUALIFIED',
      4: 'PROPOSAL_SENT',
      5: 'NEGOTIATION',
      6: 'WON',
      7: 'LOST'
    };
    return numMap[numericStage];
  }
  return fallbackMom ? getStageFromMom(fallbackMom) : 'NEW_LEAD';
};

export default function PipelineTab() {
  const [pipelineType, setPipelineType] = useState('meeting'); // meeting, lead
  const [viewMode, setViewMode] = useState('table'); // board, list, table
  const [isLoading, setIsLoading] = useState(false);
  const [animateGraph, setAnimateGraph] = useState(false);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('All stages');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    productType: '',
    leadSource: '',
    sortField: 'updatedAt', // updatedAt, companyName, dealValue, expectedCloseDate
    sortDirection: 'desc'
  });

  // Modal controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMomModal, setShowMomModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [tempSelectedStage, setTempSelectedStage] = useState(null);
  const [followUpDate, setFollowUpDate] = useState('');

  const [momForm, setMomForm] = useState({
    productsPitched: [],
    budget: '',
    timeline: '0-3 Months',
    leadType: 'Warm',
    isInterested: true,
    competitorsMentioned: '',
    alreadyPitchedToOrg: false,
    pitchedToWhom: '',
    pitchedByWhom: '',
    currentBlockers: '',
    nextStep: 'Technical Discussion',
    followUpDate: ''
  });

  // Form states
  const [leadForm, setLeadForm] = useState({
    company: '',
    product: [], // array of selected product labels
    industry: '',
    city: '',
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    stage: 'NEW_LEAD',
    dealValue: '',
    partner: '',
    leadSource: 'DIRECT',
    expectedCloseDate: '',
    priority: 'WARM',
    notes: '',
    address: '',
    customerType: 'Customer'
  });

  const [momNotes, setMomNotes] = useState('');

  // Autocomplete lists
  const [companySearch, setCompanySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [suggestedCompanies, setSuggestedCompanies] = useState([]);
  const [suggestedContacts, setSuggestedContacts] = useState([]);
  
  // Custom designations catalog
  const [designations, setDesignations] = useState([]);
  const [newDesignation, setNewDesignation] = useState('');
  const [showAddDesignationInput, setShowAddDesignationInput] = useState(false);

  // Master lists from API
  const [rawLeads, setRawLeads] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [allMoms, setAllMoms] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [unifiedLeads, setUnifiedLeads] = useState([]);

  // Expanded cards tracker for List View
  const [expandedCards, setExpandedCards] = useState({});

  // Animate distribution graph after loading
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setAnimateGraph(true), 150);
      return () => clearTimeout(timer);
    } else {
      setAnimateGraph(false);
    }
  }, [isLoading]);

  // Format date helper
  const getFormattedDate = () => {
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return today.toLocaleDateString('en-US', options);
  };

  const toggleExpandCard = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch all master data from backend
  const fetchPipelineData = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      
      const [
        leadsRes,
        allCustomersRes,
        assignedCustomersRes,
        momsRes,
        productsRes,
        designationsRes
      ] = await Promise.all([
        getLeads().catch(() => []),
        getAllCustomerDetails().catch(() => []),
        getAllCustomersByUserId(userId).catch(() => []),
        getAllMomDetails().catch(() => []),
        getAllProducts().catch(() => []),
        getDesignations().catch(() => ({ data: [] }))
      ]);

      const leadsArr = Array.isArray(leadsRes?.data) ? leadsRes.data : Array.isArray(leadsRes) ? leadsRes : [];
      const allCustArr = Array.isArray(allCustomersRes?.data) ? allCustomersRes.data : Array.isArray(allCustomersRes) ? allCustomersRes : [];
      const assCustArr = Array.isArray(assignedCustomersRes?.data) ? assignedCustomersRes.data : Array.isArray(assignedCustomersRes) ? assignedCustomersRes : [];
      const momsArr = Array.isArray(momsRes?.data) ? momsRes.data : Array.isArray(momsRes) ? momsRes : [];
      const prodArr = Array.isArray(productsRes?.data) ? productsRes.data : Array.isArray(productsRes) ? productsRes : [];
      const desigArr = Array.isArray(designationsRes?.data) ? designationsRes.data : Array.isArray(designationsRes) ? designationsRes : [];

      setRawLeads(leadsArr);
      setAllCustomers(allCustArr);
      setAssignedCustomers(assCustArr);
      setAllMoms(momsArr);
      setProductsCatalog(prodArr);
      setDesignations(desigArr);

      buildUnifiedPipeline(leadsArr, allCustArr, assCustArr, momsArr);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  // Helper: get a stable customer ID from a customer record
  const getCustomerRecordId = (customer) => {
    const id = customer?.id ?? customer?.customerId ?? customer?.customer_id ?? customer?.customerID ?? '';
    return id ? String(id) : '';
  };

  // Helper: get the customer ID referenced by a MOM entry
  const getMomCustomerId = (mom) => {
    const id =
      mom?.account_id ?? mom?.accountId ?? mom?.customer_id ?? mom?.customerId ??
      mom?.customerID ?? mom?.account?.id ?? mom?.customer?.id ?? '';
    return id ? String(id) : '';
  };

  // Helper: get the customer ID referenced by a lead entry
  const getLeadCustomerId = (lead) => {
    const id =
      lead?.customerId ?? lead?.customer_id ?? lead?.customerID ??
      lead?.accountId ?? lead?.account_id ?? lead?.accountID ??
      lead?.customerMasterId ?? lead?.customer_master_id ??
      lead?.customer?.id ?? lead?.customer?.customerId ??
      lead?.account?.id ?? '';
    return id ? String(id) : '';
  };

  // Merge lists to build dynamic unified rows — matches mobile app's buildLeadRows pattern
  const buildUnifiedPipeline = (leads, allCust, assignedCust, moms) => {
    // 1. Build customer ID set and lookup maps
    const userCustomerIds = new Set(assignedCust.map(getCustomerRecordId).filter(Boolean));
    const customerMap = {};
    const companyToId = {};

    // Index assigned customers first (they take priority)
    assignedCust.forEach((c) => {
      const id = getCustomerRecordId(c);
      if (!id) return;
      customerMap[id] = c;
      const compName = (c.companyName || c.customerName || c.name || c.accountName || '').trim().toLowerCase();
      if (compName && !companyToId[compName]) companyToId[compName] = id;
    });

    // Enrich with allCust data for customers we already know about
    allCust.forEach((c) => {
      const id = getCustomerRecordId(c);
      if (id && customerMap[id]) {
        customerMap[id] = { ...c, ...customerMap[id] };
      }
      const compName = (c.companyName || c.customerName || c.name || c.accountName || '').trim().toLowerCase();
      if (compName && !companyToId[compName] && id && userCustomerIds.has(id)) {
        companyToId[compName] = id;
      }
    });

    // 2. Group MOMs by customer — keep only the latest per customer
    const sortedMoms = [...moms].sort((a, b) => {
      const left = Number(a?.id || new Date(a?.createdAt || a?.updatedAt || 0).getTime() || 0);
      const right = Number(b?.id || new Date(b?.createdAt || b?.updatedAt || 0).getTime() || 0);
      return left - right; // ascending so later entries overwrite earlier ones
    });

    const latestMomByCustomer = {};
    sortedMoms.forEach((mom) => {
      const customerId = getMomCustomerId(mom);
      if (customerId && userCustomerIds.has(customerId)) {
        latestMomByCustomer[customerId] = mom;
      }
    });

    // 3. Resolve a lead's customer ID via direct ID or fuzzy company name match
    const resolveLeadCustomerId = (lead) => {
      const directId = getLeadCustomerId(lead);
      if (directId && userCustomerIds.has(directId)) return directId;
      const compName = (lead?.company || lead?.companyName || lead?.customerName || lead?.accountName || '').trim().toLowerCase();
      const mappedId = companyToId[compName];
      if (mappedId && userCustomerIds.has(mappedId)) return mappedId;
      return '';
    };

    // 4. Shared row builder
    const createRow = (id, lead, customer, mom, idx) => {
      const pitch = mom?.pitch_details || {};
      const outcome = mom?.outcome || {};

      const companyName = 
        lead?.company || 
        lead?.companyName || 
        customer?.companyName || 
        customer?.customerName || 
        customer?.company || 
        customer?.name || 
        customer?.accountName || 
        mom?.companyName || 
        mom?.customerName || 
        mom?.accountName || 
        mom?.company || 
        'Unknown Company';

      const contactName = 
        lead?.contactName || 
        lead?.contact || 
        customer?.contactPerson || 
        customer?.contactPersonName || 
        customer?.name || 
        mom?.contactPersonName || 
        mom?.contactName || 
        'Unassigned';
      const stage = lead ? getStageFromLead(lead, mom) : mom ? getStageFromMom(mom) : 'NEW_LEAD';

      // Deal value: lead first, then MOM budget fallback (matching mobile app)
      const rawBudget = lead?.dealValue || lead?.value || lead?.budget || pitch?.budget || mom?.budget || '';
      const dealValNum = parseBudgetToCr(rawBudget);

      const followUpStr = lead?.expectedCloseDate || outcome?.follow_up_date || mom?.follow_up_date || customer?.followUpDate || customer?.nextMeetingDate || '';
      let isOverdue = false;
      let isHighRisk = false;

      if (followUpStr && !['WON', 'LOST'].includes(stage)) {
        const followUpDateObj = new Date(followUpStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (followUpDateObj < today) {
          isOverdue = true;
          const diffDays = Math.ceil((today - followUpDateObj) / (1000 * 60 * 60 * 24));
          if (diffDays > 7 || lead?.priority === 'HIGH' || lead?.priority === 'HOT') {
            isHighRisk = true;
          }
        }
      }

      // Products: merge from lead and MOM
      const leadProduct = lead?.product || '';
      const momProducts = (pitch?.products_pitched || mom?.products_pitched || mom?.productsPitched || '');
      const product = leadProduct || (Array.isArray(momProducts) ? momProducts.join(', ') : String(momProducts || ''));

      const source = lead?.leadSource || (mom ? (mom?.engagement_type || mom?.engagementType || 'Meeting') : 'DIRECT');

      return {
        id: id,
        leadId: lead?.id || lead?.leadId || lead?.lead_id || '',
        leadData: lead,
        momId: mom?.id || '',
        momData: mom,
        company: companyName,
        contactName: contactName,
        email: lead?.email || customer?.email || customer?.emailId || '',
        phone: lead?.phone || lead?.phoneNo || customer?.phoneNo || customer?.phone || customer?.mobileNo || '',
        stage,
        dealValue: rawBudget || '0',
        dealValueNumeric: dealValNum,
        expectedCloseDate: lead?.expectedCloseDate || outcome?.follow_up_date || '',
        leadSource: source,
        priority: lead?.priority || (isOverdue ? 'HIGH' : String(pitch?.lead_type || '').toUpperCase() || 'MEDIUM'),
        notes: lead?.notes || outcome?.notes || mom?.notes || mom?.momDescription || (lead ? 'No notes captured yet.' : 'No MOM captured yet.'),
        address: lead?.address || customer?.locationName || '',
        city: lead?.city || customer?.city || '',
        product,
        designation: lead?.designation || customer?.designation || '',
        partner: lead?.partner || pitch?.pitched_by_whom || mom?.partner || mom?.reseller || '',
        blockers: mom?.current_blockers || customer?.blockers || '',
        isOverdue,
        isHighRisk,
        followUpDate: followUpStr
      };
    };

    // 5. Pass 1: Create rows from leads (enriched with matching MOM data)
    const rows = [];
    const customersWithLeadRows = new Set();

    leads.forEach((lead, idx) => {
      const customerId = resolveLeadCustomerId(lead) || `unknown-${idx}`;
      const customer = customerMap[customerId] || { companyName: lead?.company || lead?.companyName, customerType: 'Lead' };
      const matchedMom = latestMomByCustomer[customerId] || null;

      customersWithLeadRows.add(customerId);
      rows.push(createRow(lead.id || `lead-${idx}`, lead, customer, matchedMom, idx));
    });

    // 6. Pass 2: Create rows for MOM-only customers (no lead entry)
    Object.entries(customerMap).forEach(([customerId, customer]) => {
      if (customersWithLeadRows.has(customerId)) return;
      const mom = latestMomByCustomer[customerId];
      if (mom) {
        rows.push(createRow(`mom-${customerId}-${mom.id || 'latest'}`, null, customer, mom, 0));
      }
    });

    setUnifiedLeads(rows);
  };

  // Autocomplete helpers
  const handleCompanySearch = (val) => {
    setCompanySearch(val);
    setLeadForm((prev) => ({ ...prev, company: val }));
    if (val.trim().length > 1) {
      const matches = allCustomers.filter(
        (c) =>
          (c.companyName && c.companyName.toLowerCase().includes(val.toLowerCase())) ||
          (c.name && c.name.toLowerCase().includes(val.toLowerCase()))
      );
      setSuggestedCompanies(matches);
    } else {
      setSuggestedCompanies([]);
    }
  };

  const selectCompany = (cust) => {
    setLeadForm((prev) => ({
      ...prev,
      company: cust.companyName || cust.name || '',
      contactName: cust.contactPerson || cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      address: cust.locationName || '',
      city: cust.city || 'Mumbai',
      designation: cust.designation || ''
    }));
    setCompanySearch(cust.companyName || cust.name || '');
    setContactSearch(cust.contactPerson || cust.name || '');
    setSuggestedCompanies([]);
  };

  const handleContactSearch = (val) => {
    setContactSearch(val);
    setLeadForm((prev) => ({ ...prev, contactName: val }));
    if (val.trim().length > 1) {
      const matches = allCustomers.filter(
        (c) => c.contactPerson && c.contactPerson.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestedContacts(matches);
    } else {
      setSuggestedContacts([]);
    }
  };

  const selectContact = (cust) => {
    setLeadForm((prev) => ({
      ...prev,
      contactName: cust.contactPerson || cust.name || '',
      company: cust.companyName || prev.company || '',
      email: cust.email || prev.email || '',
      phone: cust.phone || prev.phone || ''
    }));
    setContactSearch(cust.contactPerson || cust.name || '');
    setSuggestedContacts([]);
  };

  // Add custom designation dynamically
  const handleAddDesignation = async () => {
    if (newDesignation.trim()) {
      try {
        await createNewDesignation(newDesignation.trim());
        setDesignations((prev) => [...prev, { name: newDesignation.trim() }]);
        setLeadForm((prev) => ({ ...prev, designation: newDesignation.trim() }));
        setNewDesignation('');
        setShowAddDesignationInput(false);
      } catch (err) {
        alert('Failed to save designation');
      }
    }
  };

  // Submit Lead creation / update
  const handleSaveLead = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...leadForm,
        product: Array.isArray(leadForm.product) ? leadForm.product.join(', ') : leadForm.product
      };
      await saveOrUpdateLead(payload);
      alert('Lead opportunity saved successfully!');
      setShowCreateModal(false);
      // Reset form
      setLeadForm({ company: '', product: [], industry: '', city: '', contactName: '', designation: '', email: '', phone: '', stage: 'NEW_LEAD', dealValue: '', partner: '', leadSource: 'DIRECT', expectedCloseDate: '', priority: 'WARM', notes: '', address: '', customerType: 'Customer' });
      setCompanySearch('');
      setContactSearch('');
      fetchPipelineData();
    } catch (error) {
      alert('Error saving lead: ' + (error?.response?.data?.message || error.message));
    }
  };


  const handleSaveMomDetails = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload = {
        companyName: selectedLead?.company || '',
        contactPersonName: selectedLead?.contactName || '',
        momDescription: momNotes,
        meetingLogId: selectedLead?.momId || null,
        pitch_details: {
          products_pitched: momForm.productsPitched,
          budget: momForm.budget || 'TBD',
          timeline: momForm.timeline || '0-3 Months',
          lead_type: momForm.leadType || 'Warm',
          is_interested: momForm.isInterested
        },
        competition_and_history: {
          competitors_mentioned: momForm.competitorsMentioned || 'None',
          already_pitched_to_org: momForm.alreadyPitchedToOrg,
          pitched_to_whom: momForm.pitchedToWhom || '',
          pitched_by_whom: momForm.pitchedByWhom || '',
          current_blockers: momForm.currentBlockers || ''
        },
        outcome: {
          next_step: momForm.nextStep || 'Technical Discussion',
          follow_up_date: momForm.followUpDate || '',
          notes: momNotes
        }
      };
      await saveMoMDetailsOfCustomer(payload);
      alert('MOM details added successfully!');
      setMomNotes('');
      setShowMomModal(false);
      fetchPipelineData();
    } catch (err) {
      alert('MOM update failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMOMProductCheck = (label) => {
    const isChecked = momForm.productsPitched.includes(label);
    if (isChecked) {
      setMomForm((prev) => ({
        ...prev,
        productsPitched: prev.productsPitched.filter((p) => p !== label)
      }));
    } else {
      setMomForm((prev) => ({
        ...prev,
        productsPitched: [...prev.productsPitched, label]
      }));
    }
  };

  const openEditMomModal = (leadItem) => {
    setSelectedLead(leadItem);
    const mom = leadItem?.momData || {};
    const pitch = mom?.pitch_details || {};
    const comp = mom?.competition_and_history || {};
    const outcome = mom?.outcome || {};

    setMomNotes(mom?.momDescription || outcome?.notes || leadItem?.notes || '');
    setMomForm({
      productsPitched: Array.isArray(pitch?.products_pitched) 
        ? pitch.products_pitched 
        : (pitch?.products_pitched ? String(pitch.products_pitched).split(', ') : []),
      budget: pitch?.budget || leadItem?.budget || mom?.budget || '',
      timeline: pitch?.timeline || '0-3 Months',
      leadType: pitch?.lead_type || 'Warm',
      isInterested: pitch?.is_interested !== undefined ? pitch.is_interested : true,
      competitorsMentioned: comp?.competitors_mentioned || '',
      alreadyPitchedToOrg: comp?.already_pitched_to_org || false,
      pitchedToWhom: comp?.pitched_to_whom || leadItem?.contactName || '',
      pitchedByWhom: comp?.pitched_by_whom || '',
      currentBlockers: comp?.current_blockers || leadItem?.blockers || '',
      nextStep: outcome?.next_step || 'Technical Discussion',
      followUpDate: outcome?.follow_up_date || leadItem?.expectedCloseDate || ''
    });
    setShowMomModal(true);
  };

  const handleCloseLead = (leadItem) => {
    setSelectedLead(leadItem);
    setShowCloseModal(true);
  };

  const updateMomStage = async (leadItem, nextStep, followUpDate = '') => {
    try {
      setIsLoading(true);
      const rawMom = leadItem.momData || {};
      const payload = {
        companyName: leadItem.company || rawMom.companyName || '',
        contactPersonName: leadItem.contactName || rawMom.contactPersonName || '',
        momDescription: rawMom.momDescription || '',
        meetingLogId: leadItem.momId || null,
        pitch_details: rawMom.pitch_details || {
          products_pitched: '',
          budget: 'TBD',
          timeline: '0-3 Months',
          lead_type: 'Warm',
          is_interested: false
        },
        competition_and_history: rawMom.competition_and_history || {
          competitor_name: '',
          blockers: '',
          pitched_to_whom: '',
          pitched_by_whom: '',
          already_pitched: false
        },
        outcome: {
          ...(rawMom.outcome || {}),
          next_step: nextStep,
          follow_up_date: followUpDate
        }
      };
      await saveMoMDetailsOfCustomer(payload);
      alert(`Lead stage updated to ${nextStep} successfully.`);
      fetchPipelineData();
    } catch (error) {
      alert('Failed to update lead: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadStage = async (leadItem, status) => {
    try {
      setIsLoading(true);
      const raw = leadItem.leadData || {};
      const payload = {
        id: leadItem.leadId,
        company: raw.company || '',
        product: Array.isArray(raw.product) ? raw.product.join(', ') : raw.product || '',
        industry: raw.industry || '',
        city: raw.city || '',
        contactName: raw.contactName || '',
        designation: raw.designation || '',
        email: raw.email || '',
        phone: raw.phone || '',
        stage: status,
        dealValue: raw.dealValue || '',
        partner: raw.partner || '',
        leadSource: raw.leadSource || 'DIRECT',
        expectedCloseDate: raw.expectedCloseDate || '',
        priority: raw.priority || 'WARM',
        notes: raw.notes || '',
        address: raw.address || '',
        customerType: raw.customerType || 'Customer'
      };
      await saveOrUpdateLead(payload);
      alert(`Lead stage updated to ${status.replace('_', ' ').toLowerCase()} successfully.`);
      fetchPipelineData();
    } catch (error) {
      alert('Failed to update lead: ' + (error?.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Multi-select Pitched Product check handling
  const handleProductCheck = (label) => {
    const isChecked = leadForm.product.includes(label);
    if (isChecked) {
      setLeadForm((prev) => ({ ...prev, product: prev.product.filter((p) => p !== label) }));
    } else {
      setLeadForm((prev) => ({ ...prev, product: [...prev.product, label] }));
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      alert('No data to export!');
      return;
    }
    const headers = [
      'Company', 'Contact Name', 'Stage', 'Value',
      'Products', 'Source', 'Follow-Up Date', 'Priority', 'City', 'Notes'
    ];
    const rows = filteredRows.map((lead) => [
      `"${lead.company}"`,
      `"${lead.contactName}"`,
      `"${lead.stage}"`,
      `"${lead.dealValue}"`,
      `"${lead.product}"`,
      `"${lead.leadSource}"`,
      `"${lead.followUpDate}"`,
      `"${lead.priority}"`,
      `"${lead.city}"`,
      `"${lead.notes ? lead.notes.replace(/"/g, '""') : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${pipelineType}_pipeline_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Segment stages mapping
  const STAGES_PILLS = [
    'All stages',
    'Initial Contact',
    'Tech Discussion',
    'Demo',
    'Proposal',
    'Negotiation',
    'Won',
    'Lost'
  ];

  // Map pill selector to exact database stage strings
  const matchesPillStage = (itemStage, pill) => {
    if (pill === 'All stages') return true;
    const lowerPill = pill.toLowerCase();
    const lowerStage = itemStage.toLowerCase();

    if (lowerPill === 'initial contact') {
      return lowerStage === 'new_lead' || lowerStage === 'contacted' || lowerStage.includes('initial');
    }
    if (lowerPill === 'tech discussion') {
      return lowerStage === 'qualified' || lowerStage.includes('discussion') || lowerStage.includes('tech');
    }
    if (lowerPill === 'demo') {
      return lowerStage === 'qualified' || lowerStage.includes('demo');
    }
    if (lowerPill === 'proposal') {
      return lowerStage === 'proposal_sent' || lowerStage.includes('proposal');
    }
    if (lowerPill === 'negotiation') {
      return lowerStage === 'negotiation' || lowerStage.includes('negotiat');
    }
    if (lowerPill === 'won') {
      return lowerStage === 'won';
    }
    if (lowerPill === 'lost') {
      return lowerStage === 'lost';
    }
    return false;
  };

  // Filter & search pipeline list
  const filteredRows = unifiedLeads
    .filter((row) => {
      // 1. Filter by search query
      const query = searchQuery.toLowerCase();
      const matchQuery =
        searchQuery === '' ||
        row.company.toLowerCase().includes(query) ||
        row.contactName.toLowerCase().includes(query) ||
        row.product.toLowerCase().includes(query) ||
        row.city.toLowerCase().includes(query) ||
        row.leadSource.toLowerCase().includes(query) ||
        row.notes.toLowerCase().includes(query);

      // 2. Filter by selected stage pill
      const matchStage = matchesPillStage(row.stage, selectedStage);

      // 3. Filter by Segment selection:
      // Meeting Pipeline typically tracks active/discussion pipelines, while Leads tracks raw/unassigned prospects.
      // We can classify deals with values as active pipeline meetings, and unvalued/new leads as Leads.
      const isLeadOnly = row.dealValueNumeric === 0;
      const matchSegment = pipelineType === 'meeting' ? !isLeadOnly : isLeadOnly;

      // 4. Advanced Filters
      const matchAdvancedProduct =
        advancedFilters.productType === '' ||
        row.product.toLowerCase().includes(advancedFilters.productType.toLowerCase());

      const matchAdvancedSource =
        advancedFilters.leadSource === '' ||
        row.leadSource.toLowerCase() === advancedFilters.leadSource.toLowerCase();

      return matchQuery && matchStage && matchAdvancedProduct && matchAdvancedSource;
    })
    .sort((a, b) => {
      // Sort logic
      const field = advancedFilters.sortField;
      const direction = advancedFilters.sortDirection === 'asc' ? 1 : -1;

      if (field === 'companyName') {
        return a.company.localeCompare(b.company) * direction;
      }
      if (field === 'dealValue') {
        return (a.dealValueNumeric - b.dealValueNumeric) * direction;
      }
      if (field === 'expectedCloseDate') {
        return (new Date(a.expectedCloseDate || 0) - new Date(b.expectedCloseDate || 0)) * direction;
      }
      // Fallback updatedAt / follow-up date
      return (new Date(a.followUpDate || 0) - new Date(b.followUpDate || 0)) * direction;
    });

  // Calculate Metrics
  const calculateMetrics = () => {
    // 1. Active Pipeline: total value of ongoing/active deals (excludes won/lost status)
    const activeDeals = unifiedLeads.filter((d) => !['WON', 'LOST'].includes(d.stage));
    const activePipelineVal = activeDeals.reduce((sum, d) => sum + d.dealValueNumeric, 0);

    // 2. Total Opportunities
    const totalOpportunities = unifiedLeads.length;

    // 3. Revenue Won: Total budget value of deals in Won stage
    const wonDeals = unifiedLeads.filter((d) => d.stage === 'WON');
    const revenueWon = wonDeals.reduce((sum, d) => sum + d.dealValueNumeric, 0);

    // 4. Win Rate: Percentage of won deals relative to all closed deals: won / (won + lost)
    const lostCount = unifiedLeads.filter((d) => d.stage === 'LOST').length;
    const wonCount = wonDeals.length;
    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return {
      activePipelineVal,
      totalOpportunities,
      revenueWon,
      winRate
    };
  };

  const metrics = calculateMetrics();

  // Get distribution counts for progress bar segment
  const getStageCounts = () => {
    const counts = {};
    unifiedLeads.forEach((d) => {
      const stageName = d.stage.replace('_', ' ');
      counts[stageName] = (counts[stageName] || 0) + 1;
    });
    return Object.entries(counts).map(([stage, count]) => ({
      stage,
      count,
      percent: unifiedLeads.length > 0 ? (count / unifiedLeads.length) * 100 : 0
    }));
  };

  const distribution = getStageCounts();

  // Column headers for Board View (Kanban)
  const KANBAN_COLUMNS = [
    { label: 'Leads / Initial Contact', key: 'initial', dbStages: ['NEW_LEAD', 'CONTACTED'] },
    { label: 'Technical Discussion / Qualified', key: 'qualified', dbStages: ['QUALIFIED'] },
    { label: 'Proposals / Negotiations', key: 'proposals', dbStages: ['PROPOSAL_SENT', 'NEGOTIATION'] }
  ];

  const getKanbanColumnLeads = (dbStages) => {
    return filteredRows.filter((row) =>
      dbStages.includes(row.stage) || 
      (dbStages.includes('QUALIFIED') && row.stage.toLowerCase().includes('discussion')) ||
      (dbStages.includes('PROPOSAL_SENT') && row.stage.toLowerCase().includes('proposal'))
    );
  };

  return (
    <div className="space-y-6 text-slate-100 relative z-20 animate-fade">
      
      {/* HEADER & DYNAMIC DATE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1628]/60 border border-white/5 p-5 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            Pipeline Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{getFormattedDate()}</p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-900/60 border border-white/5 hover:border-blue-500/20 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
            title="Export filtered CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Segment Selector Removed - Showing All Leads */}

      {/* PIPELINE METRICS & ANALYTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-5 hover:border-blue-500/20 transition duration-300">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Pipeline</span>
          <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">
            {formatCr(metrics.activePipelineVal)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Excluding won & lost deals</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/20 transition duration-300">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Leads</span>
          <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">{metrics.totalOpportunities}</h3>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Opportunities registered</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-5 hover:border-emerald-500/20 transition duration-300">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Revenue Won</span>
          <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">
            {formatCr(metrics.revenueWon)}
          </h3>
          <p className="text-[10px] text-emerald-400 mt-1 font-medium">Won deal budgets</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-5 hover:border-purple-500/20 transition duration-300">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Win Rate</span>
          <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">{metrics.winRate}%</h3>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Won / Closed ratios</p>
        </div>
      </div>

      {/* Segment Distribution Progress bar */}
      <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 space-y-4 shadow overflow-hidden relative group">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-2">
          Pipeline Distribution
          <div className="h-px bg-slate-800 flex-1 ml-2"></div>
        </span>
        
        {/* Stacked segmented bar */}
        <div className="h-4 w-full bg-slate-900/80 rounded-full overflow-hidden flex shadow-inner p-0.5 gap-0.5">
          {distribution.map((seg, idx) => {
            const colors = [
              'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]', 
              'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]', 
              'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]', 
              'bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]', 
              'bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]', 
              'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.3)]'
            ];
            
            return (
              <div
                key={idx}
                style={{ 
                  width: animateGraph ? `${seg.percent}%` : '0%',
                  transition: `width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s` 
                }}
                className={`${colors[idx % colors.length]} h-full rounded-full transition-all duration-300 hover:scale-y-125 hover:brightness-125 hover:z-10 relative cursor-pointer group/segment`}
              >
                {/* Tooltip on hover */}
                <div className="absolute opacity-0 group-hover/segment:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap pointer-events-none transition-all duration-300 transform translate-y-2 group-hover/segment:translate-y-0 z-20 shadow-xl border border-white/10">
                  {seg.stage}: {seg.count} ({seg.percent}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* Distribution Legend labels */}
        <div className="flex flex-wrap gap-x-4 gap-y-3 text-[11px] text-slate-300 pt-1">
          {distribution.map((seg, idx) => {
            const borderColors = ['border-blue-500', 'border-emerald-500', 'border-amber-500', 'border-indigo-500', 'border-purple-500', 'border-rose-500'];
            return (
              <span 
                key={idx} 
                className="flex items-center gap-2 font-semibold hover:text-white transition-all cursor-default"
                style={{ 
                  opacity: animateGraph ? 1 : 0, 
                  transform: animateGraph ? 'translateY(0)' : 'translateY(10px)',
                  transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + idx * 0.1}s` 
                }}
              >
                <span className={`h-2.5 w-2.5 rounded-full border-2 ${borderColors[idx % borderColors.length]} shadow-[0_0_5px_currentColor]`}></span>
                {seg.stage} <span className="text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md text-[9px] font-bold">{seg.count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* CONTROLS: SEARCH & filters bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-b border-white/5 pb-4">
        
        {/* Text query input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search company, contact, products, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          {/* Advanced filters sheet trigger */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              showAdvancedFilters
                ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                : 'bg-slate-900/60 border-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          {/* View Mode Toggle pills */}
          <div className="flex bg-[#0c1220]/60 p-1 rounded-xl border border-white/5 select-none shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
              title="Table View"
            >
              <Table className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'board' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
              title="Board View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
              title="List View"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters expansion panel */}
      {showAdvancedFilters && (
        <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade shadow">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 block">Product Filter</label>
            <select
              value={advancedFilters.productType}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, productType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Products</option>
              {productsCatalog.map((prod, idx) => (
                <option key={idx} value={prod.name || prod.label || prod}>{prod.name || prod.label || prod}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 block">Lead Source</label>
            <select
              value={advancedFilters.leadSource}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, leadSource: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Sources</option>
              {['PARTNER_REFERAL', 'DIRECT', 'INBOUND_WEBSITE', 'EVENT_TRADESHOW', 'COLD_OUTREACH', 'LINKEDIN', 'EXISTING_CUSTOMER', 'OTHER'].map((src) => (
                <option key={src} value={src}>{src.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 block">Sort Field</label>
            <select
              value={advancedFilters.sortField}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, sortField: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="updatedAt">Follow Up Date</option>
              <option value="companyName">Company Name</option>
              <option value="dealValue">Deal Value</option>
              <option value="expectedCloseDate">Expected Close Date</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 block">Direction</label>
            <select
              value={advancedFilters.sortDirection}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, sortDirection: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      )}

      {/* STAGE PILLS SELECTOR */}
      <div className="flex overflow-x-auto gap-2 py-2 hide-scrollbar scroll-smooth">
        {STAGES_PILLS.map((stage) => (
          <button
            key={stage}
            onClick={() => setSelectedStage(stage)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedStage === stage
                ? 'bg-blue-600 text-white shadow shadow-blue-500/20'
                : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* VIEW PANEL RENDERING */}

      {/* 1. BOARD VIEW (KANBAN) */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 select-none">
          {KANBAN_COLUMNS.map((col) => {
            const colLeads = getKanbanColumnLeads(col.dbStages);
            return (
              <div
                key={col.key}
                className="w-full bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 flex flex-col max-h-[60vh] overflow-y-auto hide-scrollbar space-y-4"
              >
                {/* Header column title */}
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pr-2">
                    {col.label}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards rendering */}
                <div className="space-y-3">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowDetailsModal(true);
                      }}
                      className="p-4 bg-slate-900/60 rounded-xl border border-white/5 hover:border-blue-500/25 hover:bg-slate-900/90 transition cursor-pointer space-y-3 relative group"
                    >
                      {lead.isHighRisk && (
                        <div className="absolute top-3 right-3 text-rose-500" title="High Risk - Action Overdue">
                          <AlertTriangle className="h-4 w-4 fill-current text-rose-500/10" />
                        </div>
                      )}

                      <div className="space-y-1 pr-6">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{lead.company}</h4>
                        <p className="text-[11px] text-slate-400 truncate">Contact: {lead.contactName}</p>
                      </div>

                      <div className="flex justify-between items-center mt-3 text-xs">
                        <span className="text-emerald-400 font-bold font-mono">{formatCr(lead.dealValueNumeric)}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          lead.priority === 'HIGH' || lead.priority === 'HOT'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                            : lead.priority === 'MEDIUM' || lead.priority === 'WARM'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                        }`}>
                          {lead.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="py-12 text-center text-slate-600 text-xs font-medium">No leads in stage</div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 3. TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg animate-fade">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/40 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">Company / Client</th>
                  <th className="py-4 px-5">Contact Person</th>
                  <th className="py-4 px-5">Designation</th>
                  <th className="py-4 px-5">Stage</th>
                  <th className="py-4 px-5">Deal Value</th>
                  <th className="py-4 px-5">Close Date</th>
                  <th className="py-4 px-5">Priority</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredRows.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-900/30 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        {lead.isHighRisk && (
                          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" title="High Risk - Action Overdue" />
                        )}
                        <span className="font-bold text-slate-100">{lead.company}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">{lead.contactName}</td>
                    <td className="py-4 px-5">{lead.designation || 'TBD'}</td>
                    <td className="py-4 px-5">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase text-[9px] font-bold">
                        {lead.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-emerald-400">
                      {formatCr(lead.dealValueNumeric)}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">
                      {lead.expectedCloseDate || 'TBD'}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        lead.priority === 'HIGH' || lead.priority === 'HOT'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                          : lead.priority === 'MEDIUM' || lead.priority === 'WARM'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                      }`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex gap-2 justify-end">
                        {lead.leadId ? (
                          <button
                            onClick={() => handleCloseLead(lead)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow"
                          >
                            Update Lead
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditMomModal(lead)}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow"
                          >
                            Edit MOM Detail
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500 font-medium">
                      No leads matching filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. LIST VIEW (EXPANDABLE LIST) */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredRows.map((lead) => {
            const isExpanded = expandedCards[lead.id];
            return (
              <div
                key={lead.id}
                className="bg-[#0c1220]/60 border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/15 transition-all"
              >
                {/* Header row summaries */}
                <div
                  onClick={() => toggleExpandCard(lead.id)}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-900/35 transition"
                >
                  <div className="flex items-center gap-3">
                    {lead.isHighRisk && (
                      <span className="p-1 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-500 animate-pulse">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-100">{lead.company}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Contact: {lead.contactName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold self-stretch sm:self-auto justify-between sm:justify-end">
                    <span className="text-emerald-400 font-bold font-mono">{formatCr(lead.dealValueNumeric)}</span>
                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full uppercase text-[9px] font-bold">
                      {lead.stage.replace('_', ' ')}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details body */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 bg-[#0a0f1b]/40 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade">
                    
                    {/* Left Column: Contact details */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-white/5 pb-1">
                        Contact Details & Specs
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Designation</p>
                          <p className="text-slate-200 mt-0.5">{lead.designation || 'Unassigned'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Phone</p>
                          <p className="text-slate-200 mt-0.5">{lead.phone || 'No phone'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Email</p>
                          <p className="text-slate-200 mt-0.5 truncate">{lead.email || 'No email'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">City</p>
                          <p className="text-slate-200 mt-0.5">{lead.city}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Address Location</p>
                        <p className="text-xs text-slate-300 mt-1">{lead.address || 'No address details'}</p>
                      </div>
                    </div>

                    {/* Right Column: Stage & Action items */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h5 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-white/5 pb-1">
                          Pipeline Outcomes & Notes
                        </h5>
                        <div className="text-xs space-y-2">
                          <p className="flex justify-between">
                            <span className="text-slate-500">Expected Close Date:</span>
                            <span className="font-mono font-bold text-slate-200">{lead.expectedCloseDate || 'Not set'}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-500">Source:</span>
                            <span className="font-bold text-slate-200">{lead.leadSource.replace('_', ' ')}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-500">Products Pitched:</span>
                            <span className="font-semibold text-slate-200">{lead.product || 'Unassigned'}</span>
                          </p>
                        </div>

                        {lead.notes && (
                          <div className="bg-slate-950/40 p-2 rounded border border-white/5">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">MOM notes outcome:</p>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{lead.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Expand Actions list */}
                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/5 w-full">
                        {lead.leadId ? (
                          <button
                            onClick={() => handleCloseLead(lead)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow"
                          >
                            Update Lead
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditMomModal(lead)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow"
                          >
                            Edit MOM Detail
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })}
          {filteredRows.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
              No leads matching filter queries
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / UPDATE LEAD */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Add Pipeline Opportunity</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCompanySearch('');
                  setContactSearch('');
                  setSuggestedCompanies([]);
                  setSuggestedContacts([]);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              
              {/* Autocomplete Company */}
              <div className="relative">
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company / Client Name (Required)</label>
                <input
                  type="text"
                  placeholder="Type to search database..."
                  value={companySearch}
                  onChange={(e) => handleCompanySearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />

                {suggestedCompanies.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-slate-900 border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-2xl divide-y divide-white/5">
                    {suggestedCompanies.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => selectCompany(c)}
                        className="px-4 py-2.5 hover:bg-slate-800 text-xs cursor-pointer text-slate-300 hover:text-white"
                      >
                        {c.companyName || c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Autocomplete Contact Name */}
              <div className="relative">
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Contact Person Name (Required)</label>
                <input
                  type="text"
                  placeholder="Type to search database..."
                  value={contactSearch}
                  onChange={(e) => handleContactSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />

                {suggestedContacts.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-slate-900 border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-2xl divide-y divide-white/5">
                    {suggestedContacts.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => selectContact(c)}
                        className="px-4 py-2.5 hover:bg-slate-800 text-xs cursor-pointer text-slate-300 hover:text-white"
                      >
                        {c.contactPerson} {c.companyName ? `(${c.companyName})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 99999 99999"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
              </div>

              {/* Designation Selector */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Designation Role</label>
                <div className="flex gap-2">
                  <select
                    value={leadForm.designation}
                    onChange={(e) => setLeadForm({ ...leadForm, designation: e.target.value })}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="">Select Designation...</option>
                    {designations.map((d, idx) => (
                      <option key={idx} value={d.name || d}>{d.name || d}</option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    onClick={() => setShowAddDesignationInput(!showAddDesignationInput)}
                    className="px-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-lg text-xs font-semibold"
                  >
                    New
                  </button>
                </div>

                {/* Add Custom Designation Field */}
                {showAddDesignationInput && (
                  <div className="flex gap-2 mt-2 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <input
                      type="text"
                      placeholder="e.g. Sales Chief"
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-white/5 text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDesignation}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Close Date & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Expected Close Date</label>
                  <input
                    type="date"
                    value={leadForm.expectedCloseDate}
                    onChange={(e) => setLeadForm({ ...leadForm, expectedCloseDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Pipeline Stage</label>
                  <select
                    value={leadForm.stage}
                    onChange={(e) => setLeadForm({ ...leadForm, stage: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="NEW_LEAD">New Lead</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="PROPOSAL_SENT">Proposal Sent</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>

              {/* Deal Value & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Estimated Deal Value (Cr)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.2 or 0.5"
                    value={leadForm.dealValue}
                    onChange={(e) => setLeadForm({ ...leadForm, dealValue: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Lead Source</label>
                  <select
                    value={leadForm.leadSource}
                    onChange={(e) => setLeadForm({ ...leadForm, leadSource: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    {['PARTNER_REFERAL', 'DIRECT', 'INBOUND_WEBSITE', 'EVENT_TRADESHOW', 'COLD_OUTREACH', 'LINKEDIN', 'EXISTING_CUSTOMER', 'OTHER'].map((src) => (
                      <option key={src} value={src}>{src.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Partner Name & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Partner / Agency name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alliance Ltd"
                    value={leadForm.partner}
                    onChange={(e) => setLeadForm({ ...leadForm, partner: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Priority</label>
                  <select
                    value={leadForm.priority}
                    onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="COLD">Low</option>
                    <option value="WARM">Medium</option>
                    <option value="HOT">High</option>
                  </select>
                </div>
              </div>

              {/* Pitched Products multi-select checklist */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-2 block">Pitched Products Suite</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-4 rounded-xl border border-white/5 max-h-40 overflow-y-auto hide-scrollbar">
                  {productsCatalog.map((prod, idx) => {
                    const label = prod.name || prod.label || prod;
                    const isChecked = leadForm.product.includes(label);
                    return (
                      <label key={idx} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleProductCheck(label)}
                          className="rounded bg-slate-950 border-white/10 text-blue-600 focus:ring-0 h-4 w-4"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes & Address */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Full Address Details</label>
                <input
                  type="text"
                  placeholder="Street and Office building"
                  value={leadForm.address}
                  onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Pipeline Notes</label>
                <textarea
                  rows="3"
                  placeholder="Record summary details..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 resize-none text-slate-100"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                SAVE LEAD OPPORTUNITY
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL DETAILS OVERLAY MODAL */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedLead.company}</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5 block">
                  Category: {selectedLead.stage.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLead(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content summary grid */}
            <div className="space-y-4">
              
              {/* Profile card */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contact Information</span>
                <div className="space-y-2 text-xs text-slate-300">
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="font-semibold">{selectedLead.contactName}</span>
                    {selectedLead.designation && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">({selectedLead.designation})</span>}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>{selectedLead.phone || 'No phone number registered'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">{selectedLead.email || 'No email address registered'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{selectedLead.address || 'No address details'} - {selectedLead.city}</span>
                  </p>
                </div>
              </div>

              {/* Deal specs card */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-2.5 text-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Deal Specs</span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-slate-500">Estimated Value:</span>
                    <p className="font-extrabold text-emerald-400 mt-0.5">{formatCr(selectedLead.dealValueNumeric)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected Close Date:</span>
                    <p className="font-bold text-slate-200 mt-0.5">{selectedLead.expectedCloseDate || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Source:</span>
                    <p className="font-bold text-slate-200 mt-0.5">{selectedLead.leadSource.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Priority:</span>
                    <p className="font-bold text-slate-200 mt-0.5">{selectedLead.priority}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2 mt-2">
                  <span className="text-slate-500">Products Pitched:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedLead.product || 'None'}</p>
                </div>
              </div>

              {/* Notes & Risk analysis */}
              {selectedLead.blockers && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 fill-current text-rose-500/10" />
                    Blockers Flagged
                  </span>
                  <p className="text-xs text-rose-300/90 leading-relaxed">{selectedLead.blockers}</p>
                </div>
              )}

              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Meeting Notes (MOM)</span>
                <p className="text-slate-300 leading-relaxed italic">{selectedLead.notes || 'No meeting log outcome notes captured yet.'}</p>
              </div>

              {/* Details Action trigger MOM */}
              <button
                onClick={() => openEditMomModal(selectedLead)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                ADD / UPDATE MOM SUMMARY
              </button>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: UPDATE LEAD OPTIONS MODAL */}
      {showCloseModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative text-left">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                Update Lead: {selectedLead.company}
              </h3>
              <button 
                onClick={() => {
                  setShowCloseModal(false);
                  setSelectedLead(null);
                  setTempSelectedStage(null);
                  setFollowUpDate('');
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {selectedLead.leadId ? (
              // Option list for Leads
              <>
                <p className="text-[11px] text-slate-400">
                  Select a stage to update this lead opportunity instantly:
                </p>

                <div className="flex flex-col gap-2 pt-1 max-h-[60vh] overflow-y-auto pr-1 hide-scrollbar">
                  {[
                    { label: 'New Lead', value: 'NEW_LEAD', color: 'hover:bg-slate-800 hover:text-slate-200 border-white/5 text-slate-400' },
                    { label: 'Contacted', value: 'CONTACTED', color: 'hover:bg-blue-600/10 hover:border-blue-500/20 hover:text-blue-300 border-white/5 text-slate-400' },
                    { label: 'Qualified', value: 'QUALIFIED', color: 'hover:bg-indigo-600/10 hover:border-indigo-500/20 hover:text-indigo-300 border-white/5 text-slate-400' },
                    { label: 'Proposal Sent', value: 'PROPOSAL_SENT', color: 'hover:bg-amber-600/10 hover:border-amber-500/20 hover:text-amber-300 border-white/5 text-slate-400' },
                    { label: 'Negotiation', value: 'NEGOTIATION', color: 'hover:bg-purple-600/10 hover:border-purple-500/20 hover:text-purple-300 border-white/5 text-slate-400' },
                    { label: 'Won', value: 'WON', color: 'hover:bg-emerald-600/10 hover:border-emerald-500/20 hover:text-emerald-300 border-white/5 text-slate-400' },
                    { label: 'Lost', value: 'LOST', color: 'hover:bg-rose-600/10 hover:border-rose-500/20 hover:text-rose-300 border-white/5 text-slate-400' },
                  ].map((stage) => {
                    const isCurrent = (selectedLead.stage || 'NEW_LEAD') === stage.value;
                    return (
                      <button
                        key={stage.value}
                        onClick={async () => {
                          await updateLeadStage(selectedLead, stage.value);
                          setShowCloseModal(false);
                          setSelectedLead(null);
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] ${
                          isCurrent
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/15'
                            : `bg-slate-900/40 border-white/5 ${stage.color}`
                        }`}
                      >
                        <span>{stage.label}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold text-white">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              // Option list for MOM-based leads
              <>
                <p className="text-[11px] text-slate-400">
                  Select a meeting next-step outcome to update this customer:
                </p>

                <div className="flex flex-col gap-2 pt-1 max-h-[45vh] overflow-y-auto pr-1 hide-scrollbar">
                  {[
                    { label: 'Technical Discussion', value: 'Technical Discussion', color: 'hover:bg-blue-600/10 hover:border-blue-500/20 hover:text-blue-300 border-white/5 text-slate-400' },
                    { label: 'Demo', value: 'Demo', color: 'hover:bg-indigo-600/10 hover:border-indigo-500/20 hover:text-indigo-300 border-white/5 text-slate-400' },
                    { label: 'POC Request', value: 'POC Request', color: 'hover:bg-purple-600/10 hover:border-purple-500/20 hover:text-purple-300 border-white/5 text-slate-400' },
                    { label: 'Proposal', value: 'Proposal', color: 'hover:bg-amber-600/10 hover:border-amber-500/20 hover:text-amber-300 border-white/5 text-slate-400' },
                    { label: 'Negotiations', value: 'Negotiations', color: 'hover:bg-orange-600/10 hover:border-orange-500/20 hover:text-orange-300 border-white/5 text-slate-400' },
                    { label: 'Closure', value: 'Closure', color: 'hover:bg-teal-600/10 hover:border-teal-500/20 hover:text-teal-300 border-white/5 text-slate-400' },
                    { label: 'Won', value: 'Won', color: 'hover:bg-emerald-600/10 hover:border-emerald-500/20 hover:text-emerald-300 border-white/5 text-slate-400' },
                    { label: 'Lost', value: 'Lost', color: 'hover:bg-rose-600/10 hover:border-rose-500/20 hover:text-rose-300 border-white/5 text-slate-400' },
                  ].map((stage) => {
                    const currentOutcome = selectedLead.momData?.outcome?.next_step || selectedLead.momData?.next_step || 'Technical Discussion';
                    const isCurrent = currentOutcome === stage.value;
                    const isTempSelected = tempSelectedStage === stage.value;
                    
                    return (
                      <button
                        key={stage.value}
                        onClick={async () => {
                          if (stage.value === 'Won' || stage.value === 'Lost') {
                            await updateMomStage(selectedLead, stage.value);
                            setShowCloseModal(false);
                            setSelectedLead(null);
                            setTempSelectedStage(null);
                          } else {
                            setTempSelectedStage(stage.value);
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] ${
                          isTempSelected
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/15'
                            : isCurrent && !tempSelectedStage
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : `bg-slate-900/40 border-white/5 ${stage.color}`
                        }`}
                      >
                        <span>{stage.label}</span>
                        {isCurrent && !tempSelectedStage && (
                          <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider font-semibold text-slate-300">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Follow Up Date Picker (Shown if any option other than Won/Lost is selected) */}
                {tempSelectedStage && tempSelectedStage !== 'Won' && tempSelectedStage !== 'Lost' && (
                  <div className="bg-[#0c1220] border border-white/10 p-4 rounded-xl space-y-3 mt-3 animate-fade text-left">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Follow Up Date</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!followUpDate) {
                          alert('Please select a follow up date.');
                          return;
                        }
                        await updateMomStage(selectedLead, tempSelectedStage, followUpDate);
                        setShowCloseModal(false);
                        setSelectedLead(null);
                        setTempSelectedStage(null);
                        setFollowUpDate('');
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow"
                    >
                      Save Follow Up & Update
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {showMomModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade max-h-[90vh] overflow-y-auto hide-scrollbar">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-400" />
                MOM Log: {selectedLead.company}
              </h3>
              <button onClick={() => setShowMomModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMomDetails} className="space-y-4 text-left">
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                <p><span className="font-bold text-slate-200">Company:</span> {selectedLead.company}</p>
                <p><span className="font-bold text-slate-200">Contact:</span> {selectedLead.contactName}</p>
              </div>

              {/* Section: Pitch Details */}
              <div className="space-y-2.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                  Pitch Details
                </div>
                
                {/* Pitched Products Checklist */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Pitched Products</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-white/5 max-h-24 overflow-y-auto hide-scrollbar">
                    {productsCatalog.map((prod, idx) => {
                      const label = prod.name || prod.label || prod;
                      const isChecked = momForm.productsPitched.includes(label);
                      return (
                        <label key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-300 hover:text-white cursor-pointer select-none transition">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMOMProductCheck(label)}
                            className="rounded bg-slate-900 border-white/10 text-indigo-600 focus:ring-0 h-3.5 w-3.5"
                          />
                          {label}
                        </label>
                      );
                    })}
                    {productsCatalog.length === 0 && (
                      <p className="text-[9px] text-slate-500 italic col-span-2">No products available</p>
                    )}
                  </div>
                </div>

                {/* Budget & Timeline */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Budget</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5 Cr"
                      value={momForm.budget}
                      onChange={(e) => setMomForm({ ...momForm, budget: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Timeline</label>
                    <select
                      value={momForm.timeline}
                      onChange={(e) => setMomForm({ ...momForm, timeline: e.target.value })}
                      className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="0-3 Months">0-3 Months</option>
                      <option value="3-6 Months">3-6 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="6-12 Months">6-12 Months</option>
                      <option value="12 Months+">12 Months+</option>
                    </select>
                  </div>
                </div>

                {/* Lead Type & Interested flag */}
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Lead Type</label>
                    <select
                      value={momForm.leadType}
                      onChange={(e) => setMomForm({ ...momForm, leadType: e.target.value })}
                      className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="Cold">Cold</option>
                      <option value="Warm">Warm</option>
                      <option value="Hot">Hot</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 mt-4">
                    <input
                      type="checkbox"
                      id="momIsInterested"
                      checked={momForm.isInterested}
                      onChange={(e) => setMomForm({ ...momForm, isInterested: e.target.checked })}
                      className="rounded bg-slate-950 border-white/10 text-indigo-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                    />
                    <label htmlFor="momIsInterested" className="text-[11px] text-slate-300 cursor-pointer select-none font-semibold">
                      Client Interested?
                    </label>
                  </div>
                </div>
              </div>

              {/* Section: Competition & History */}
              <div className="space-y-2.5 pt-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                  Competition & History
                </div>

                {/* Competitors & Blockers */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Competitors</label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Tech, LexCorp"
                      value={momForm.competitorsMentioned}
                      onChange={(e) => setMomForm({ ...momForm, competitorsMentioned: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Blockers</label>
                    <input
                      type="text"
                      placeholder="e.g. Legal team approval"
                      value={momForm.currentBlockers}
                      onChange={(e) => setMomForm({ ...momForm, currentBlockers: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Pitched To & Pitched By */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Pitched To Whom</label>
                    <input
                      type="text"
                      placeholder="Contact person"
                      value={momForm.pitchedToWhom}
                      onChange={(e) => setMomForm({ ...momForm, pitchedToWhom: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Pitched By Whom</label>
                    <input
                      type="text"
                      placeholder="Sales rep name"
                      value={momForm.pitchedByWhom}
                      onChange={(e) => setMomForm({ ...momForm, pitchedByWhom: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Already pitched */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="momAlreadyPitched"
                    checked={momForm.alreadyPitchedToOrg}
                    onChange={(e) => setMomForm({ ...momForm, alreadyPitchedToOrg: e.target.checked })}
                    className="rounded bg-slate-950 border-white/10 text-indigo-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                  />
                  <label htmlFor="momAlreadyPitched" className="text-[11px] text-slate-300 cursor-pointer select-none font-semibold">
                    Already Pitched to Organization?
                  </label>
                </div>
              </div>

              {/* Section: Outcome & Notes */}
              <div className="space-y-2.5 pt-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                  Outcome & Notes
                </div>

                {/* Next step & Follow Up */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Next Step</label>
                    <select
                      value={momForm.nextStep}
                      onChange={(e) => setMomForm({ ...momForm, nextStep: e.target.value })}
                      className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="Technical Discussion">Technical Discussion</option>
                      <option value="Demo">Demo</option>
                      <option value="POC Request">POC Request</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Negotiations">Negotiations</option>
                      <option value="Closure">Closure</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Follow Up Date</label>
                    <input
                      type="date"
                      value={momForm.followUpDate}
                      onChange={(e) => setMomForm({ ...momForm, followUpDate: e.target.value })}
                      className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-150 cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Notes text area */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 block">MOM Discussion Summary</label>
                  <textarea
                    rows="3"
                    placeholder="Type meeting discussion summary, decisions, next steps..."
                    value={momNotes}
                    onChange={(e) => setMomNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-100 focus:outline-none focus:border-indigo-500 resize-none transition"
                    required
                  ></textarea>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                SUBMIT MOM DETAILS
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
