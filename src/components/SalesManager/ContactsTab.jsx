import React, { useState } from 'react';
import { Search, Plus, Phone, Mail, UserPlus } from 'lucide-react';

export default function ContactsTab({ contacts, setContacts, searchQuery }) {
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', company: '', phone: '', email: '', tag: 'Lead' });

  const handleAddContact = (e) => {
    e.preventDefault();
    if (newContact.name && newContact.company) {
      setContacts([
        ...contacts,
        {
          id: Date.now(),
          name: newContact.name,
          company: newContact.company,
          phone: newContact.phone || '+91 99999 99999',
          email: newContact.email || 'info@company.com',
          tag: newContact.tag
        }
      ]);
      setNewContact({ name: '', company: '', phone: '', email: '', tag: 'Lead' });
      setShowAddContactModal(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade">
      {/* Search bar inside content area for Contacts */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, or email..."
            value={searchQuery}
            disabled={true} /* Let the header input control it, or allow local fallback */
            className="pl-10 pr-4 py-2 w-full rounded-xl bg-slate-900/45 border border-white/5 text-sm text-slate-400 cursor-not-allowed focus:outline-none"
            title="Use the search bar in the top header"
          />
        </div>
        <button
          onClick={() => setShowAddContactModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          ADD CONTACT
        </button>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-5 hover:border-blue-500/20 transition-all duration-300 relative group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-white/5">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-100">{contact.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{contact.company}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                contact.tag === 'Hot'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                  : contact.tag === 'Warm'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
              }`}>
                {contact.tag}
              </span>
            </div>

            <div className="mt-5 space-y-2 border-t border-white/5 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                <span>{contact.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate">{contact.email}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            No contacts found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* CREATE NEW CONTACT MODAL */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Add New Contact</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-xs text-slate-400 hover:text-white">Close</button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. name@company.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Contact Category Tag</label>
                <select
                  value={newContact.tag}
                  onChange={(e) => setNewContact({ ...newContact, tag: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  <option value="Lead">Lead</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/10 transition-all mt-2"
              >
                SAVE CONTACT
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
