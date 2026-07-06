import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function CalendarTab({ meetings, setMeetings }) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', company: '', time: '', date: '2026-07-06' });

  const handleSchedule = (e) => {
    e.preventDefault();
    if (newMeeting.title && (newMeeting.company || newMeeting.time)) {
      setMeetings([
        ...meetings,
        {
          id: Date.now(),
          title: newMeeting.title,
          company: newMeeting.company,
          time: newMeeting.time || '12:00 PM',
          date: newMeeting.date
        }
      ]);
      setNewMeeting({ title: '', company: '', time: '', date: '2026-07-06' });
      setShowScheduleModal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Styled Calendar Container */}
        <div className="flex-1 bg-[#0c1220]/60 border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-100">July 2026</h3>
            <div className="flex gap-2">
              <button className="p-1 px-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-xs transition">Prev</button>
              <button className="p-1 px-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-xs transition">Next</button>
            </div>
          </div>

          {/* Calendar Grid Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-mono">
            {/* Empty slots for spacing */}
            <span></span><span></span><span></span><span></span><span></span>
            <span className="p-2 text-slate-600">1</span>
            <span className="p-2 text-slate-600">2</span>
            <span className="p-2 text-slate-600">3</span>
            <span className="p-2 text-slate-600">4</span>
            <span className="p-2 text-slate-600">5</span>
            <span className="p-2 bg-blue-600 text-white rounded-xl font-bold relative shadow-md">
              6
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 bg-emerald-400 rounded-full"></span>
            </span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">7</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">8</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">9</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">10</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">11</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">12</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">13</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">14</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">15</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">16</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">17</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">18</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">19</span>
            <span className="p-2 hover:bg-slate-800 rounded-xl cursor-pointer">20</span>
          </div>
        </div>

        {/* Scheduled Meetings List */}
        <div className="w-full lg:w-96 bg-[#0c1220]/60 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-100 mb-4">Meetings & Tasks</h3>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 hover:border-blue-500/25 transition">
                  <h4 className="text-sm font-bold text-slate-200">{meeting.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{meeting.company || meeting.customer}</p>
                  <div className="flex justify-between items-center mt-3 text-[11px] text-slate-500 font-mono">
                    <span>{meeting.date}</span>
                    <span className="text-blue-400">{meeting.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            SCHEDULE MEETING
          </button>
        </div>

      </div>

      {/* SCHEDULE MEETING MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Schedule New Meeting</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-xs text-slate-400 hover:text-white">Close</button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Meeting Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Alignment Call"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company / Client</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={newMeeting.company}
                  onChange={(e) => setNewMeeting({ ...newMeeting, company: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Time</label>
                <input
                  type="text"
                  placeholder="e.g. 10:30 AM"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/10 transition-all mt-2"
              >
                SCHEDULE
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
