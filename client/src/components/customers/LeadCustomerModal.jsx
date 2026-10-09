'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus, User, Building2, Mail, Phone, Briefcase,
  Navigation, MapPin, Globe, Hash, ShieldCheck, Snowflake,
  Flame, Target, UserCheck, FileText, AlertTriangle,
  CheckCircle, X, Sparkles, Calendar, Clock, Tag,
  TrendingUp, AlertCircle, Layers, ArrowRight, Star,
  MessageSquare, Video, Handshake, Check
} from 'lucide-react';
import { getCombinedEmployees, getNextInquiryNo } from '../../utils/crmStore';
import {
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  getAreasByCity,
  getPincodeForArea,
  lookupPincodeAPI
} from '../../utils/locationData';
import SelectWithOther from '../common/SelectWithOther';
import './LeadCustomerModal.css';

/* ─── TOP-LEVEL HELPER COMPONENTS (STABLE DOM REFERENCES) ───── */
function FieldGroup({ id, label, req, sub, icon: Icon, children, state, error }) {
  return (
    <div className="lcm-field">
      <label className="lcm-label">
        <span className="lcm-label-icon"><Icon size={13} /></span>
        <span className="lcm-label-text">{label}</span>
        {req && <span className="lcm-label-req">*</span>}
        {sub && <span className="lcm-label-sub">{sub}</span>}
      </label>
      <div className={`lcm-input-wrap ${state || ''}`}>
        {children}
      </div>
      {state === 'is-invalid' && error && (
        <span className="lcm-err-txt"><AlertCircle size={12} /> {error}</span>
      )}
    </div>
  );
}

function ValidationIcons({ state }) {
  if (state === 'is-valid')   return <CheckCircle size={16} className="lcm-val-ico v-valid" />;
  if (state === 'is-invalid') return <AlertCircle size={16} className="lcm-val-ico v-invalid" />;
  return null;
}

export default function LeadCustomerModal({
  isOpen, onClose, onSubmit, employees = [], initialData = null, isEdit = false, currentUser = null
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  let activeUser = currentUser;
  if (!activeUser && typeof window !== 'undefined') {
    try {
      const uStr = sessionStorage.getItem('crm_user') || localStorage.getItem('crm_user');
      if (uStr) activeUser = JSON.parse(uStr);
    } catch (e) {}
  }

  const currentUserName = activeUser?.name || activeUser?.username || 'Staff';
  const currentUserId   = String(activeUser?.id || activeUser?._id || '');

  let rawEmployees = Array.isArray(employees) && employees.length > 0 ? [...employees] : [];
  if (activeUser && currentUserId && !rawEmployees.some(e => String(e._id || e.id) === currentUserId)) {
    rawEmployees = [activeUser, ...rawEmployees];
  }

  const selectEmployees = rawEmployees.length > 0 ? rawEmployees : getCombinedEmployees([]);

  const currentUserOption = selectEmployees.find(
    emp => String(emp._id || emp.id) === currentUserId || (emp.name || emp.username)?.toLowerCase() === currentUserName.toLowerCase()
  ) || (currentUserId ? { _id: currentUserId, name: currentUserName } : selectEmployees[0]);

  const defaultAssignedId = initialData?.assignedToId || (currentUserOption ? String(currentUserOption._id || currentUserOption.id) : currentUserId);

  const [formData, setFormData] = useState({
    inquiryNo:        initialData?.inquiryNo        || getNextInquiryNo(),
    leadDate:         todayStr,
    contactPerson:    initialData?.customerName     || initialData?.contactPerson    || '',
    companyName:      initialData?.company          || initialData?.companyName       || '',
    email:            initialData?.email            || '',
    primaryContact:   initialData?.phone            || initialData?.primaryContact   || '',
    alternateContact: initialData?.alternateContact || '',
    industry:         initialData?.industry         || '',
    leadSource:       initialData?.leadSource       || 'TeleCaller',
    address:          initialData?.address          || '',
    country:          initialData?.country          || 'India',
    state:            initialData?.state            || 'Gujarat',
    city:             initialData?.city             || 'Ahmedabad',
    area:             initialData?.area             || 'SG Highway',
    pincode:          initialData?.pincode          || '380054',
    leadStatus:       initialData?.status           || 'warm',
    assignedToId:     initialData?.assignedToId     || defaultAssignedId,
    disqualifiedReason:  initialData?.disqualifiedReason  || '',
    disqualifiedRemarks: initialData?.disqualifiedRemarks || '',
    followupNotes:       initialData?.followupNotes       || '',
    nextFollowupDate:    initialData?.nextFollowupDate    || todayStr,
    preferredTime:       initialData?.preferredTime       || '14:00',
    followupType:        initialData?.followupType        || 'Telephonic',
  });

  const [touched,         setTouched]         = useState({});
  const [errors,          setErrors]          = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Sync formData whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSubmitAttempted(false);
      setTouched({});
      if (initialData) {
        setFormData({
          inquiryNo:        initialData.inquiryNo        || getNextInquiryNo(),
          leadDate:         initialData.leadDate         || todayStr,
          contactPerson:    initialData.customerName     || initialData.contactPerson    || '',
          companyName:      initialData.company          || initialData.companyName       || '',
          email:            initialData.email            || '',
          primaryContact:   initialData.phone            || initialData.primaryContact   || '',
          alternateContact: initialData.alternateContact || '',
          industry:         initialData.industry         || '',
          leadSource:       initialData.leadSource       || 'TeleCaller',
          address:          initialData.address          || '',
          country:          initialData.country          || 'India',
          state:            initialData.state            || 'Gujarat',
          city:             initialData.city             || 'Ahmedabad',
          area:             initialData.area             || 'SG Highway',
          pincode:          initialData.pincode          || '380054',
          leadStatus:       initialData.status           || initialData.leadStatus       || 'warm',
          assignedToId:     initialData.assignedToId     || defaultAssignedId,
          disqualifiedReason:  initialData.disqualifiedReason  || '',
          disqualifiedRemarks: initialData.disqualifiedRemarks || '',
          followupNotes:       initialData.followupNotes       || '',
          nextFollowupDate:    initialData.nextFollowupDate    || todayStr,
          preferredTime:       initialData.preferredTime       || '14:00',
          followupType:        initialData.followupType        || 'Telephonic',
        });
      } else {
        setFormData({
          inquiryNo:        getNextInquiryNo(),
          leadDate:         todayStr,
          contactPerson:    '',
          companyName:      '',
          email:            '',
          primaryContact:   '',
          alternateContact: '',
          industry:         '',
          leadSource:       'TeleCaller',
          address:          '',
          country:          'India',
          state:            'Gujarat',
          city:             'Ahmedabad',
          area:             'SG Highway',
          pincode:          '380054',
          leadStatus:       'warm',
          assignedToId:     defaultAssignedId,
          disqualifiedReason:  '',
          disqualifiedRemarks: '',
          followupNotes:       '',
          nextFollowupDate:    todayStr,
          preferredTime:       '14:00',
          followupType:        'Telephonic',
        });
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialData, currentUser]);

  useEffect(() => {
    setErrors(validateForm(formData));
  }, [formData]);

  if (!isOpen) return null;

  /* ─── VALIDATION ──────────────────────────────────────────── */
  function validateForm(d) {
    const errs = {};
    const today = new Date().toISOString().split('T')[0];

    if (!d.contactPerson?.trim())                         errs.contactPerson = 'Contact person name is required';
    else if (d.contactPerson.trim().length < 2)           errs.contactPerson = 'Name must be at least 2 characters';

    if (d.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
      errs.email = 'Enter a valid email (e.g. name@company.com)';
    }

    if (!d.primaryContact?.trim())                        errs.primaryContact = 'Primary contact number is required';
    else if (d.primaryContact.replace(/\D/g, '').length !== 10) errs.primaryContact = 'Must be exactly 10 digits';

    if (d.alternateContact?.trim()) {
      if (d.alternateContact.replace(/\D/g, '').length !== 10) errs.alternateContact = 'Must be exactly 10 digits';
    }

    if (d.address?.trim() && d.address.trim().length < 2) {
      errs.address = 'Address must be at least 2 characters';
    }

    if (d.pincode?.trim()) {
      if (d.country === 'India' && d.pincode.replace(/\D/g, '').length !== 6) {
        errs.pincode = 'Pincode must be 6 digits';
      } else if (d.pincode.trim().length < 2) {
        errs.pincode = 'Invalid zip/pincode';
      }
    }

    const needsFollowup = ['warm','hot','prospect'].includes(d.leadStatus);
    if (needsFollowup) {
      if (!d.followupNotes?.trim())                       errs.followupNotes = 'Follow-up notes are required';
      else if (d.followupNotes.trim().length < 5)         errs.followupNotes = 'Notes must be at least 5 characters';
      if (!d.nextFollowupDate)                            errs.nextFollowupDate = 'Follow-up date is required';
      else if (d.nextFollowupDate < today)                errs.nextFollowupDate = 'Date cannot be in the past';
    }

    if (d.leadStatus === 'cold' && !d.disqualifiedReason) errs.disqualifiedReason = 'Please select a disqualification reason';

    return errs;
  }

  /* ─── LOCATION DYNAMIC OPTIONS ────────────────────────────── */
  const countryList = getCountries();

  const stateList = getStatesByCountry(formData.country);
  if (formData.state && !stateList.includes(formData.state)) {
    stateList.push(formData.state);
  }

  const cityList = getCitiesByState(formData.country, formData.state);
  if (formData.city && !cityList.includes(formData.city)) {
    cityList.push(formData.city);
  }

  const rawAreas = getAreasByCity(formData.country, formData.state, formData.city);
  const areaList = rawAreas.map(a => typeof a === 'string' ? a : a.name);
  if (formData.area && !areaList.includes(formData.area)) {
    areaList.push(formData.area);
  }

  /* ─── HANDLERS ────────────────────────────────────────────── */
  const handleChange = (field, value) => {
    let v = value;
    if (field === 'primaryContact' || field === 'alternateContact') v = value.replace(/\D/g, '').slice(0, 10);
    
    if (field === 'pincode') {
      v = value.slice(0, 10);
      setFormData(p => ({ ...p, pincode: v }));
      setTouched(p => ({ ...p, pincode: true }));
      if (v.length === 6 && /^\d{6}$/.test(v)) {
        lookupPincodeAPI(v).then(res => {
          if (res) {
            setFormData(prev => ({
              ...prev,
              country: res.country || prev.country,
              state: res.state || prev.state,
              city: res.city || prev.city,
              area: res.defaultArea || prev.area,
              pincode: v
            }));
          }
        });
      }
      return;
    }

    if (field === 'country') {
      const nextCountry = value;
      const knownCountries = getCountries();
      if (knownCountries.includes(nextCountry)) {
        const nextStates = getStatesByCountry(nextCountry);
        const nextState = nextStates[0] || '';
        const nextCities = getCitiesByState(nextCountry, nextState);
        const nextCity = nextCities[0] || '';
        const nextAreas = getAreasByCity(nextCountry, nextState, nextCity);
        const nextAreaObj = nextAreas[0];
        const nextArea = typeof nextAreaObj === 'string' ? nextAreaObj : (nextAreaObj?.name || '');
        const nextPin = typeof nextAreaObj === 'object' ? (nextAreaObj?.pincode || '') : '';

        setFormData(prev => ({
          ...prev,
          country: nextCountry,
          state: nextState,
          city: nextCity,
          area: nextArea,
          pincode: nextPin
        }));
      } else {
        setFormData(prev => ({ ...prev, country: nextCountry }));
      }
      setTouched(prev => ({ ...prev, country: true }));
      return;
    }

    if (field === 'state') {
      const nextState = value;
      const knownStates = getStatesByCountry(formData.country);
      if (knownStates.includes(nextState)) {
        const nextCities = getCitiesByState(formData.country, nextState);
        const nextCity = nextCities[0] || '';
        const nextAreas = getAreasByCity(formData.country, nextState, nextCity);
        const nextAreaObj = nextAreas[0];
        const nextArea = typeof nextAreaObj === 'string' ? nextAreaObj : (nextAreaObj?.name || '');
        const nextPin = typeof nextAreaObj === 'object' ? (nextAreaObj?.pincode || '') : '';

        setFormData(prev => ({
          ...prev,
          state: nextState,
          city: nextCity,
          area: nextArea,
          pincode: nextPin
        }));
      } else {
        setFormData(prev => ({ ...prev, state: nextState }));
      }
      setTouched(prev => ({ ...prev, state: true }));
      return;
    }

    if (field === 'city') {
      const nextCity = value;
      const knownCities = getCitiesByState(formData.country, formData.state);
      if (knownCities.includes(nextCity)) {
        const nextAreas = getAreasByCity(formData.country, formData.state, nextCity);
        const nextAreaObj = nextAreas[0];
        const nextArea = typeof nextAreaObj === 'string' ? nextAreaObj : (nextAreaObj?.name || '');
        const nextPin = typeof nextAreaObj === 'object' ? (nextAreaObj?.pincode || '') : '';

        setFormData(prev => ({
          ...prev,
          city: nextCity,
          area: nextArea,
          pincode: nextPin
        }));
      } else {
        setFormData(prev => ({ ...prev, city: nextCity }));
      }
      setTouched(prev => ({ ...prev, city: true }));
      return;
    }

    if (field === 'area') {
      const nextArea = value;
      const autoPin = getPincodeForArea(formData.country, formData.state, formData.city, nextArea);
      setFormData(prev => ({
        ...prev,
        area: nextArea,
        pincode: autoPin || prev.pincode
      }));
      setTouched(prev => ({
        ...prev,
        area: true, pincode: true
      }));
      return;
    }

    setFormData(p => ({ ...p, [field]: v }));
    setTouched(p => ({ ...p, [field]: true }));
  };

  const handleBlur = field => setTouched(p => ({ ...p, [field]: true }));

  const isFollowupRequired = ['warm','hot','prospect'].includes(formData.leadStatus);
  const totalErrors        = Object.keys(errors).length;

  const fstate = field => {
    if (!touched[field] && !submitAttempted) return '';
    if (errors[field])   return 'is-invalid';
    if (formData[field]) return 'is-valid';
    return '';
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validateForm(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const assignedEmp = selectEmployees.find(emp => String(emp._id || emp.id) === String(formData.assignedToId));
    const assignedName = assignedEmp ? (assignedEmp.name || assignedEmp.username) : currentUserName;
    const assignedId   = assignedEmp ? String(assignedEmp._id || assignedEmp.id) : (currentUserId || String(formData.assignedToId || ''));
    const assignedUsername = assignedEmp ? (assignedEmp.username || '') : (activeUser?.username || '');

    onSubmit({
      ...formData,
      customerName:       formData.contactPerson,
      company:            formData.companyName || 'Individual Client',
      phone:              formData.primaryContact,
      assignedTo:         assignedName,
      assignedToId:       assignedId,
      assignedToUsername: assignedUsername,
      createdBy:          currentUserName,
      createdById:        currentUserId,
      status:             formData.leadStatus,
    });
  };

  /* ─── STATUS OPTIONS ──────────────────────────────────────── */
  const STATUS_OPTIONS = [
    { key:'cold',     label:'Cold',     icon: Snowflake, color:'#0284C7', textColor: '#0369A1', badgeBg: '#E0F2FE', badgeBorder: '#7DD3FC', glow:'rgba(2, 132, 199, 0.15)', bg:'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 165, 233, 0.03) 100%)', border:'rgba(6, 182, 212, 0.3)' },
    { key:'warm',     label:'Warm',     icon: Flame, color:'#D97706', textColor: '#B45309', badgeBg: '#FEF3C7', badgeBorder: '#FDE68A', glow:'rgba(217, 119, 6, 0.15)', bg:'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)', border:'rgba(245, 158, 11, 0.3)' },
    { key:'hot',      label:'Hot',      icon: TrendingUp, color:'#E11D48', textColor: '#BE123C', badgeBg: '#FFE4E6', badgeBorder: '#FECDD3', glow:'rgba(225, 29, 72, 0.15)', bg:'linear-gradient(135deg, rgba(225, 29, 72, 0.08) 0%, rgba(244, 63, 94, 0.03) 100%)', border:'rgba(225, 29, 72, 0.3)' },
    { key:'prospect', label:'Prospect', icon: Target, color:'#059669', textColor: '#047857', badgeBg: '#D1FAE5', badgeBorder: '#A7F3D0', glow:'rgba(5, 150, 105, 0.15)', bg:'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)', border:'rgba(16, 185, 129, 0.3)' },
  ];

  const FOLLOWUP_TYPES = [
    { value: 'Telephonic', label: 'Telephonic', icon: Phone },
    { value: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'Email', label: 'Email', icon: Mail },
    { value: 'In-Person Meeting', label: 'Meeting', icon: Handshake },
    { value: 'Online Demo', label: 'Online Demo', icon: Video }
  ];

  const curStatus = STATUS_OPTIONS.find(s => s.key === formData.leadStatus) || STATUS_OPTIONS[0];
  const CurStatusIcon = curStatus.icon;

  /* ─── RENDER ──────────────────────────────────────────────── */
  return (
    <div className="lcm-backdrop">
      <div className="lcm-ambient-orb orb-1" />
      <div className="lcm-ambient-orb orb-2" />

      <div className="lcm-card">

        {/* ══ HEADER (CLEAN BRIGHT LIGHT MODE) ════════════════ */}
        <div className="lcm-header">
          <div className="lcm-header-bg-glow" />
          <div className="lcm-header-left">
            <div className="lcm-hdr-icon-box">
              <UserPlus size={22} className="lcm-hdr-icon-svg" />
              <div className="lcm-hdr-icon-ring" />
            </div>
            <div>
              <div className="lcm-hdr-badges">
                <span className="lcm-badge-pro">
                  <Sparkles size={11} className="lcm-badge-sparkle" /> SANMORA CRM
                </span>
                <span
                  className="lcm-badge-status"
                  style={{
                    background: curStatus.badgeBg,
                    color: curStatus.textColor,
                    borderColor: curStatus.badgeBorder,
                    boxShadow: `0 2px 8px ${curStatus.glow}`
                  }}
                >
                  <CurStatusIcon size={12} style={{ color: curStatus.color }} />
                  {formData.leadStatus.toUpperCase()} LEAD
                </span>
              </div>
              <h2 className="lcm-hdr-title">
                {isEdit ? 'Edit Customer Lead Profile' : 'Add New Customer Lead'}
              </h2>
              <p className="lcm-hdr-subtitle">
                Configure customer details, location tags, and automated sales follow-up tasks.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="lcm-close-btn" type="button" title="Close modal (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* ══ ERROR BANNER ════════════════════════════════════ */}
        {submitAttempted && totalErrors > 0 && (
          <div className="lcm-err-banner">
            <AlertCircle size={18} style={{ flexShrink:0 }} />
            <div>
              <strong>{totalErrors} validation {totalErrors === 1 ? 'error' : 'errors'} found —</strong>
              Please review the highlighted fields in red before submitting.
            </div>
          </div>
        )}

        {/* ══ FORM BODY ════════════════════════════════════════ */}
        <form onSubmit={handleSubmit} className="lcm-body" noValidate>

          {/* ── LEFT PANEL ──────────────────────────────────── */}
          <div className="lcm-left">

            {/* OPPORTUNITY INFO */}
            <div className="lcm-sec-hdr">
              <span className="lcm-sec-pill"><Layers size={14} /></span>
              <h3 className="lcm-sec-title">Opportunity & Meta</h3>
              <div className="lcm-sec-line" />
            </div>

            <div className="lcm-grid-2">
              {/* LEAD # */}
              <div className="lcm-field">
                <label className="lcm-label">
                  <span className="lcm-label-icon"><Hash size={13} /></span>
                  <span className="lcm-label-text">LEAD / INQUIRY NO</span>
                </label>
                <div className="lcm-input-wrap">
                  <div className="lcm-ico-badge"><Hash size={14} /></div>
                  <input
                    type="text"
                    className="lcm-input lcm-input-has-badge"
                    value={formData.inquiryNo}
                    onChange={e => handleChange('inquiryNo', e.target.value)}
                    placeholder="e.g. JUL26-027"
                  />
                </div>
              </div>

              {/* DATE */}
              <div className="lcm-field">
                <label className="lcm-label">
                  <span className="lcm-label-icon"><Calendar size={13} /></span>
                  <span className="lcm-label-text">CREATION DATE</span>
                  <span className="lcm-label-sub">(Today)</span>
                </label>
                <div className="lcm-input-wrap">
                  <div className="lcm-ico-badge"><Calendar size={14} /></div>
                  <input type="text" readOnly value={formData.leadDate} className="lcm-input lcm-input-has-badge lcm-input-readonly" />
                </div>
              </div>
            </div>

            {/* BASIC DETAILS */}
            <div className="lcm-sec-hdr" style={{marginTop:'6px'}}>
              <span className="lcm-sec-pill"><User size={14} /></span>
              <h3 className="lcm-sec-title">Contact & Organization</h3>
              <div className="lcm-sec-line" />
            </div>

            {/* CONTACT PERSON & COMPANY */}
            <div className="lcm-grid-2">
              <FieldGroup id="contactPerson" label="CONTACT PERSON" req icon={User} state={fstate('contactPerson')} error={errors.contactPerson}>
                <div className="lcm-ico-badge"><User size={14} /></div>
                <input
                  type="text" required className="lcm-input lcm-input-has-badge" placeholder="e.g. Rahul Verma"
                  value={formData.contactPerson}
                  onChange={e => handleChange('contactPerson', e.target.value)}
                  onBlur={() => handleBlur('contactPerson')}
                />
                <ValidationIcons state={fstate('contactPerson')} />
              </FieldGroup>

              <div className="lcm-field">
                <label className="lcm-label">
                  <span className="lcm-label-icon"><Building2 size={13} /></span>
                  <span className="lcm-label-text">COMPANY NAME</span>
                </label>
                <div className="lcm-input-wrap">
                  <div className="lcm-ico-badge"><Building2 size={14} /></div>
                  <input
                    type="text" className="lcm-input lcm-input-has-badge" placeholder="Enter company name"
                    value={formData.companyName}
                    onChange={e => handleChange('companyName', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* EMAIL & PRIMARY CONTACT */}
            <div className="lcm-grid-2">
              <FieldGroup id="email" label="EMAIL ADDRESS" icon={Mail} state={fstate('email')} error={errors.email}>
                <div className="lcm-ico-badge"><Mail size={14} /></div>
                <input
                  type="email" className="lcm-input lcm-input-has-badge" placeholder="name@company.com (Optional)"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                <ValidationIcons state={fstate('email')} />
              </FieldGroup>

              <FieldGroup id="primaryContact" label="PRIMARY PHONE #" req icon={Phone} state={fstate('primaryContact')} error={errors.primaryContact}>
                <div className="lcm-ico-badge"><Phone size={14} /></div>
                <input
                  type="text" required maxLength={10} className="lcm-input lcm-input-has-badge"
                  placeholder="9106633236 (10 digits)"
                  value={formData.primaryContact}
                  onChange={e => handleChange('primaryContact', e.target.value)}
                  onBlur={() => handleBlur('primaryContact')}
                />
                <ValidationIcons state={fstate('primaryContact')} />
              </FieldGroup>
            </div>

            {/* ALTERNATE CONTACT & INDUSTRY */}
            <div className="lcm-grid-2">
              <FieldGroup id="alternateContact" label="ALTERNATE PHONE #" icon={Phone} state={fstate('alternateContact')} error={errors.alternateContact}>
                <div className="lcm-ico-badge"><Phone size={14} /></div>
                <input
                  type="text" maxLength={10} className="lcm-input lcm-input-has-badge"
                  placeholder="9824109822 (Optional)"
                  value={formData.alternateContact}
                  onChange={e => handleChange('alternateContact', e.target.value)}
                  onBlur={() => handleBlur('alternateContact')}
                />
                <ValidationIcons state={fstate('alternateContact')} />
              </FieldGroup>

              <div className="lcm-field">
                <label className="lcm-label">
                  <span className="lcm-label-icon"><Briefcase size={13} /></span>
                  <span className="lcm-label-text">INDUSTRY DOMAIN</span>
                </label>
                <div className="lcm-input-wrap">
                  <div className="lcm-ico-badge"><Briefcase size={14} /></div>
                  <SelectWithOther
                    inputClassName="lcm-select lcm-select-has-badge"
                    value={formData.industry}
                    onChange={e => handleChange('industry', e.target.value)}
                    name="industry"
                  >
                    <option value="">-- Select Industry --</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Manufacturing Company">Manufacturing Company</option>
                    <option value="Jewellery">Jewellery</option>
                    <option value="Solar Company">Solar Company</option>
                    <option value="Interior">Interior</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Tour & Travels">Tour &amp; Travels</option>
                    <option value="Education">Education</option>
                    <option value="IT & Tech Services">IT &amp; Tech Services</option>
                    <option value="Healthcare & Pharma">Healthcare &amp; Pharma</option>
                    <option value="Banking & Finance">Banking &amp; Finance</option>
                    <option value="Enterprise Services & Other">Enterprise Services &amp; Other</option>
                  </SelectWithOther>
                </div>
              </div>
            </div>

            {/* LEAD SOURCE */}
            <div className="lcm-field">
              <label className="lcm-label">
                <span className="lcm-label-icon"><Navigation size={13} /></span>
                <span className="lcm-label-text">LEAD ACQUISITION SOURCE</span>
              </label>
              <div className="lcm-input-wrap">
                <div className="lcm-ico-badge"><Navigation size={14} /></div>
                <SelectWithOther
                  inputClassName="lcm-select lcm-select-has-badge"
                  value={formData.leadSource}
                  onChange={e => handleChange('leadSource', e.target.value)}
                  name="leadSource"
                >
                  <option value="TeleCaller">TeleCaller / Outbound Call</option>
                  <option value="Website Inquiry">Website Portal Inquiry</option>
                  <option value="Social Media">Social Media Campaign</option>
                  <option value="Referral">Direct Client Referral</option>
                  <option value="Exhibition">Exhibition &amp; Trade Event</option>
                </SelectWithOther>
              </div>
            </div>

            {/* LOCATION DETAILS */}
            <div className="lcm-sec-hdr" style={{marginTop:'6px'}}>
              <span className="lcm-sec-pill"><MapPin size={14} /></span>
              <h3 className="lcm-sec-title">Location & Address</h3>
              <div className="lcm-sec-line" />
            </div>

            {/* ADDRESS */}
            <FieldGroup id="address" label="STREET ADDRESS" icon={MapPin} state={fstate('address')} error={errors.address}>
              <div className="lcm-ico-badge"><MapPin size={14} /></div>
              <input
                type="text" className="lcm-input lcm-input-has-badge"
                placeholder="Plot / Street / Area / Landmark (Optional)"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                onBlur={() => handleBlur('address')}
              />
              <ValidationIcons state={fstate('address')} />
            </FieldGroup>

            {/* COUNTRY & STATE */}
            <div className="lcm-grid-2">
              <FieldGroup id="country" label="COUNTRY" icon={Globe} state={fstate('country')} error={errors.country}>
                <div className="lcm-ico-badge"><Globe size={14} /></div>
                <SelectWithOther
                  inputClassName="lcm-select lcm-select-has-badge"
                  value={formData.country}
                  onChange={e => handleChange('country', e.target.value)}
                  name="country"
                >
                  {countryList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SelectWithOther>
              </FieldGroup>

              <FieldGroup id="state" label="STATE / REGION" icon={MapPin} state={fstate('state')} error={errors.state}>
                <div className="lcm-ico-badge"><MapPin size={14} /></div>
                <SelectWithOther
                  inputClassName="lcm-select lcm-select-has-badge"
                  value={formData.state}
                  onChange={e => handleChange('state', e.target.value)}
                  name="state"
                >
                  {stateList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </SelectWithOther>
              </FieldGroup>
            </div>

            {/* CITY, AREA, PINCODE */}
            <div className="lcm-grid-3">
              <FieldGroup id="city" label="CITY" icon={MapPin} state={fstate('city')} error={errors.city}>
                <div className="lcm-ico-badge"><MapPin size={14} /></div>
                <SelectWithOther
                  inputClassName="lcm-select lcm-select-has-badge"
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                  name="city"
                >
                  {cityList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SelectWithOther>
                <ValidationIcons state={fstate('city')} />
              </FieldGroup>

              <div className="lcm-field">
                <label className="lcm-label">
                  <span className="lcm-label-icon"><Navigation size={13} /></span>
                  <span className="lcm-label-text">AREA</span>
                </label>
                <div className="lcm-input-wrap">
                  <div className="lcm-ico-badge"><Navigation size={14} /></div>
                  <SelectWithOther
                    inputClassName="lcm-select lcm-select-has-badge"
                    value={formData.area}
                    onChange={e => handleChange('area', e.target.value)}
                    name="area"
                  >
                    {areaList.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </SelectWithOther>
                </div>
              </div>

              <FieldGroup id="pincode" label="PINCODE" icon={Hash} state={fstate('pincode')} error={errors.pincode}>
                <div className="lcm-ico-badge"><Hash size={14} /></div>
                <input
                  type="text" maxLength={10} className="lcm-input lcm-input-has-badge" placeholder="380009"
                  value={formData.pincode}
                  onChange={e => handleChange('pincode', e.target.value)}
                  onBlur={() => handleBlur('pincode')}
                />
                <ValidationIcons state={fstate('pincode')} />
              </FieldGroup>
            </div>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────── */}
          <div className="lcm-right">

            {/* LEAD STATUS */}
            <div className="lcm-sec-hdr">
              <span className="lcm-sec-pill"><ShieldCheck size={14} /></span>
              <h3 className="lcm-sec-title">Lead Qualification Status</h3>
              <div className="lcm-sec-line" />
            </div>

            {/* HIGH-OCTANE STATUS TILES GRID */}
            <div className="lcm-status-grid">
              {STATUS_OPTIONS.map(opt => {
                const sel = formData.leadStatus === opt.key;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.key} type="button"
                    className={`lcm-status-card${sel ? ' is-selected' : ''}`}
                    style={{
                      '--sopt-color':  opt.color,
                      '--sopt-glow':   opt.glow,
                      '--sopt-bg':     opt.bg,
                      '--sopt-border': opt.border,
                    }}
                    onClick={() => handleChange('leadStatus', opt.key)}
                  >
                    <div className="lcm-status-card-inner">
                      <div className="lcm-status-icon-wrap">
                        <OptIcon size={16} />
                      </div>
                      <span className="lcm-status-label">{opt.label}</span>
                      {sel && (
                        <div className="lcm-status-check-badge">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ASSIGN TO & REFERENCE */}
            <div className="lcm-grid-1" style={{marginTop:'4px'}}>
              <div className="lcm-field">
                <label className="lcm-label">
                  <span className="lcm-label-icon"><UserCheck size={13} /></span>
                  <span className="lcm-label-text">ASSIGN TO AGENT</span>
                  <span className="lcm-label-req">*</span>
                </label>
                <div className="lcm-input-wrap">
                  <div className="lcm-ico-badge"><UserCheck size={14} /></div>
                  <select
                    className="lcm-select lcm-select-has-badge" value={formData.assignedToId}
                    onChange={e => handleChange('assignedToId', e.target.value)}
                  >
                    {selectEmployees.map(emp => (
                      <option key={emp._id || emp.id} value={emp._id || emp.id}>
                        {emp.name} {String(emp._id || emp.id) === currentUserId ? '(You)' : ''} ({emp.role?.name || emp.role || 'Sales Representative'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* DYNAMIC WORKFLOW CONTAINER */}
            {isFollowupRequired ? (
              <div className="lcm-followup-box">
                <div className="lcm-followup-hdr">
                  <div className="lcm-followup-title">
                    <Sparkles size={16} className="lcm-glow-sparkle" />
                    <span>Schedule Next Action</span>
                  </div>
                  <span className="lcm-auto-pill">Auto-Followup</span>
                </div>

                {/* FOLLOWUP NOTES */}
                <div className="lcm-field">
                  <label className="lcm-label">
                    <span className="lcm-label-icon" style={{color:'#2563EB'}}><FileText size={13} /></span>
                    <span className="lcm-label-text">FOLLOW-UP NOTES</span>
                    <span className="lcm-label-req">*</span>
                  </label>
                  <div className={`lcm-input-wrap ${fstate('followupNotes')}`}>
                    <textarea
                      rows={3} required className="lcm-textarea"
                      placeholder="Enter customer requirement summary, discussion points..."
                      value={formData.followupNotes}
                      onChange={e => handleChange('followupNotes', e.target.value)}
                      onBlur={() => handleBlur('followupNotes')}
                    />
                  </div>
                  {fstate('followupNotes') === 'is-invalid' && errors.followupNotes && (
                    <span className="lcm-err-txt"><AlertCircle size={12} /> {errors.followupNotes}</span>
                  )}
                </div>

                {/* NEXT FOLLOWUP & TIME */}
                <div className="lcm-grid-2">
                  <FieldGroup id="nextFollowupDate" label="REMINDER DATE" req icon={Calendar} state={fstate('nextFollowupDate')} error={errors.nextFollowupDate}>
                    <div className="lcm-ico-badge"><Calendar size={14} /></div>
                    <input
                      type="date" required className="lcm-input lcm-input-has-badge lcm-picker-input"
                      value={formData.nextFollowupDate}
                      onChange={e => handleChange('nextFollowupDate', e.target.value)}
                      onBlur={() => handleBlur('nextFollowupDate')}
                      onClick={e => { try { e.target.showPicker(); } catch(err){} }}
                    />
                  </FieldGroup>

                  <div className="lcm-field">
                    <label className="lcm-label">
                      <span className="lcm-label-icon" style={{color:'#2563EB'}}><Clock size={13} /></span>
                      <span className="lcm-label-text">PREFERRED TIME</span>
                    </label>
                    <div className="lcm-input-wrap">
                      <div className="lcm-ico-badge"><Clock size={14} /></div>
                      <input
                        type="time" className="lcm-input lcm-input-has-badge lcm-picker-input"
                        value={formData.preferredTime}
                        onChange={e => handleChange('preferredTime', e.target.value)}
                        onClick={e => { try { e.target.showPicker(); } catch(err){} }}
                      />
                    </div>
                  </div>
                </div>

                {/* FOLLOWUP TYPE INTERACTIVE PILLS */}
                <div className="lcm-field">
                  <label className="lcm-label">
                    <span className="lcm-label-icon" style={{color:'#2563EB'}}><Tag size={13} /></span>
                    <span className="lcm-label-text">FOLLOW-UP CHANNEL</span>
                  </label>
                  <div className="lcm-type-pills">
                    {FOLLOWUP_TYPES.map(ft => {
                      const selected = formData.followupType === ft.value;
                      const TypeIcon = ft.icon;
                      return (
                        <button
                          key={ft.value}
                          type="button"
                          className={`lcm-type-pill${selected ? ' active' : ''}`}
                          onClick={() => handleChange('followupType', ft.value)}
                        >
                          <TypeIcon size={14} className="lcm-pill-ico" />
                          <span>{ft.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="lcm-cold-box">
                <div className="lcm-cold-hdr">
                  <AlertTriangle size={17} className="lcm-cold-ico" />
                  <div className="lcm-cold-title">Disqualified Lead Detail</div>
                </div>

                <FieldGroup id="disqualifiedReason" label="DISQUALIFICATION REASON" req icon={AlertTriangle} state={fstate('disqualifiedReason')} error={errors.disqualifiedReason}>
                  <div className="lcm-ico-badge"><AlertTriangle size={14} /></div>
                  <SelectWithOther
                    inputClassName="lcm-select lcm-select-has-badge"
                    value={formData.disqualifiedReason}
                    onChange={e => handleChange('disqualifiedReason', e.target.value)}
                    name="disqualifiedReason"
                  >
                    <option value="">-- Select Disqualification Reason --</option>
                    <option value="Not Interested">Not Interested Currently</option>
                    <option value="Budget Constraint">Budget Constraints</option>
                    <option value="Competitor Chosen">Competitor Chosen</option>
                    <option value="Invalid Contact">Invalid Contact Details</option>
                  </SelectWithOther>
                </FieldGroup>

                <div className="lcm-field">
                  <label className="lcm-label">
                    <span className="lcm-label-icon" style={{color:'#EF4444'}}><FileText size={13} /></span>
                    <span className="lcm-label-text">DISQUALIFICATION REMARKS</span>
                  </label>
                  <textarea
                    rows={3} className="lcm-textarea"
                    placeholder="Enter remarks explaining why the lead was disqualified..."
                    value={formData.disqualifiedRemarks}
                    onChange={e => handleChange('disqualifiedRemarks', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="lcm-footer">
              <button
                type="submit"
                className={`lcm-btn-submit ${isFollowupRequired ? 'btn-emerald' : 'btn-cyan'}`}
              >
                <div className="lcm-btn-content">
                  <CheckCircle size={18} className="lcm-btn-icon" />
                  <span>
                    {isFollowupRequired
                      ? isEdit ? 'Update Lead & Follow-Up' : 'Save Lead & Schedule Follow-Up'
                      : isEdit ? 'Update Lead Profile'       : 'Save Disqualified Lead Record'}
                  </span>
                  <ArrowRight size={16} className="lcm-btn-arrow" />
                </div>
                <div className="lcm-btn-shimmer" />
              </button>
              <button type="button" onClick={onClose} className="lcm-btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
