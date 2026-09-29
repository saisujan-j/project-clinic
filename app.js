document.addEventListener("DOMContentLoaded", () => {

  const readFileAsDataURL = (file) => {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  // ==========================================================
  // GLOBAL SETTINGS LISTENER (Logo & Bookings Pause)
  // ==========================================================
  ClinicStore.subscribeSettings((settings) => {
    const logoEl = document.getElementById("globalClinicLogo");
    if (logoEl && settings.logoUrl) logoEl.src = settings.logoUrl;

    const isBookingOpen = settings.isBookingOpen !== false;
    const bookingNotice = document.getElementById("bookingClosedNotice");
    const bookingForm = document.getElementById("publicBookingForm");
    if (bookingNotice && bookingForm) {
      bookingNotice.classList.toggle("hidden", isBookingOpen);
      bookingForm.style.display = isBookingOpen ? "grid" : "none";
    }

    const availBadge = document.getElementById("availabilityBadge");
    const toggleBtn = document.getElementById("toggleAvailabilityBtn");
    if (availBadge && toggleBtn) {
      availBadge.innerText = isBookingOpen ? "Intake Open" : "Bookings Paused";
      availBadge.className = isBookingOpen ? "badge badge-confirmed" : "badge badge-cancelled";
      toggleBtn.innerText = isBookingOpen ? "Pause Bookings" : "Resume Bookings";
      toggleBtn.style.background = isBookingOpen ? "#dc2626" : "#284d43";
      toggleBtn.dataset.isOpen = isBookingOpen;
    }
  });

  // ==========================================================
  // 1. PATIENT SITE: TWO-STEP CATEGORIZED TREATMENTS & INTAKE
  // ==========================================================
  const treatmentsContainer = document.getElementById("treatmentsContainer");
  const categoriesOverviewGrid = document.getElementById("categoriesOverviewGrid");
  const categoryPillNav = document.getElementById("categoryPillNav");
  const categoryActiveHeader = document.getElementById("categoryActiveHeader");
  const categoryActiveTitle = document.getElementById("categoryActiveTitle");
  const categoryActiveCount = document.getElementById("categoryActiveCount");

  if (treatmentsContainer) {
    let catalogTreatments = [];
    let selectedCategory = null;

    // Show initial 4 Category Cards
    window.showCategoriesOverview = () => {
      selectedCategory = null;
      if (categoriesOverviewGrid) categoriesOverviewGrid.classList.remove("hidden");
      if (categoryPillNav) categoryPillNav.classList.add("hidden");
      if (categoryActiveHeader) categoryActiveHeader.classList.add("hidden");
      if (treatmentsContainer) treatmentsContainer.classList.add("hidden");
    };

    // Show Concerns for a Specific Category
    window.selectCategory = (categoryName) => {
      selectedCategory = categoryName;

      // Hide category cards overview, show concerns & nav pills
      if (categoriesOverviewGrid) categoriesOverviewGrid.classList.add("hidden");
      if (categoryPillNav) categoryPillNav.classList.remove("hidden");
      if (categoryActiveHeader) categoryActiveHeader.classList.remove("hidden");
      if (treatmentsContainer) treatmentsContainer.classList.remove("hidden");

      // Update Nav Pills active state
      document.querySelectorAll(".category-tab-btn").forEach(btn => {
        const isActive = btn.innerText.includes(categoryName.replace(" Treatments", "").replace(" Care", ""));
        btn.className = isActive
          ? "category-tab-btn active px-4 py-2 rounded-full text-xs sm:text-sm font-bold border border-[#284d43] bg-[#284d43] text-white transition"
          : "category-tab-btn px-4 py-2 rounded-full text-xs sm:text-sm font-bold border border-[#d8ded5] bg-white text-[#456057] transition";
      });

      renderCategoryConcerns();
    };

    function renderCategoryConcerns() {
      if (!selectedCategory) return;

      const filtered = catalogTreatments.filter(t => t.category === selectedCategory);

      if (categoryActiveTitle) categoryActiveTitle.innerText = `${selectedCategory} Concerns & Procedures`;
      if (categoryActiveCount) categoryActiveCount.innerText = `${filtered.length} Procedures Available`;

      if (filtered.length === 0) {
        treatmentsContainer.innerHTML = `
          <div class="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-[#d8ded5]">
            No concerns or treatments added under ${selectedCategory} yet.<br>
            <span class="text-xs text-gray-400">Add them from the Admin CMS.</span>
          </div>`;
        return;
      }

      treatmentsContainer.innerHTML = filtered.map(t => `
        <div class="soft-card p-5 bg-white flex flex-col justify-between hover:shadow-md transition">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#d99a21] bg-[#f8f4ea] px-2 py-0.5 rounded border border-[#f0d5a3] inline-block mb-2">${t.category}</span>
            <h4 class="font-serif text-lg text-[#284d43] font-bold mb-1.5">${t.title}</h4>
            <p class="text-xs text-[#587067] leading-relaxed line-clamp-2">${t.desc}</p>
          </div>
          <button onclick="openTreatmentModal('${t.id}')" class="btn-outline w-full text-xs font-bold py-2 mt-4 inline-flex items-center justify-center gap-1.5 hover:bg-[#284d43] hover:text-white transition">
            View Details & Results ➔
          </button>
        </div>
      `).join('');
    }

    // Subscribe to Firestore Treatments
    ClinicStore.subscribeTreatments((treatments) => {
      catalogTreatments = treatments;
      if (selectedCategory) {
        renderCategoryConcerns();
      }
    });

    window.openTreatmentModal = (id) => {
      const trt = catalogTreatments.find(t => t.id === id);
      if (!trt) return;

      document.getElementById("modalTrtBadge").innerText = trt.category;
      document.getElementById("modalTrtTitle").innerText = trt.title;
      document.getElementById("modalTrtDesc").innerText = trt.desc;

      const benefitsList = document.getElementById("modalTrtBenefits");
      benefitsList.innerHTML = (trt.benefits || []).map(b => `<li class="flex items-center gap-2"><span class="text-[#284d43] font-bold">✔</span> ${b}</li>`).join('');

      document.getElementById("modalTrtBeforeImg").src = trt.beforeImg;
      document.getElementById("modalTrtAfterImg").src = trt.afterImg;
      document.getElementById("treatmentDetailModal").classList.add("active");
    };

    window.closeTreatmentModal = () => document.getElementById("treatmentDetailModal").classList.remove("active");
    window.bookTreatmentFromModal = () => {
      closeTreatmentModal();
      document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
    };

    // Render Doctors on Patient Website
    const doctorsContainer = document.getElementById("doctorsContainer");
    if (doctorsContainer) {
      const doctors = ClinicStore.getDoctors();
      doctorsContainer.innerHTML = doctors.map(d => `
        <div class="soft-card p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center bg-white">
          <img src="${d.img || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80'}" alt="${d.name}" class="w-40 h-48 sm:w-48 sm:h-56 object-cover rounded-xl shadow-md border border-[#d8ded5]" />
          <div class="flex-1 text-center md:text-left">
            <h3 class="font-serif text-2xl font-bold text-[#284d43] mb-1">${d.name}</h3>
            <h5 class="text-xs sm:text-sm text-[#d99a21] font-bold uppercase tracking-wider mb-3">${d.qualifications} • ${d.role}</h5>
            <span class="inline-block bg-[#fdf5e6] text-[#875c12] border border-[#f0d5a3] px-3.5 py-1.5 rounded-lg text-xs font-bold">
              🕒 Consultation Timings: ${d.timings}
            </span>
          </div>
        </div>
      `).join('');
    }

    // Render Premises on Patient Website
    const premisesContainer = document.getElementById("premisesContainer");
    if (premisesContainer) {
      const premises = ClinicStore.getPremises();
      premisesContainer.innerHTML = premises.map(p => `
        <div class="soft-card overflow-hidden bg-white">
          <div class="relative h-52">
            <span class="absolute top-3 left-3 bg-[#24342f]/90 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider z-10">${p.tag}</span>
            <img src="${p.img || 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=700&q=80'}" alt="${p.title}" class="w-full h-full object-cover" />
          </div>
          <div class="p-6">
            <h4 class="font-serif text-lg font-bold text-[#284d43] mb-2">${p.title}</h4>
            <p class="text-sm text-[#587067] mb-4">${p.desc}</p>
            <ul class="space-y-2">
              ${(p.checklist || '').split('\n').filter(line => line.trim()).map(line => `<li class="text-sm flex gap-2 items-center text-[#444]"><span class="text-[#d99a21] font-bold">✔</span> ${line.trim()}</li>`).join('')}
            </ul>
          </div>
        </div>
      `).join('');
    }

    // Patient Intake Form
    const publicBookingForm = document.getElementById("publicBookingForm");
    if (publicBookingForm) {
      publicBookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = publicBookingForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting...";
        try {
          const now = new Date();
          await ClinicStore.saveAppointment({
            name: document.getElementById("pName").value.trim(),
            phone: document.getElementById("pPhone").value.trim(),
            age: document.getElementById("pAge").value.trim(),
            place: document.getElementById("pPlace").value.trim(),
            bookingTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: now.getTime(),
            date: now.toISOString().split("T")[0],
            status: "Pending"
          });
          publicBookingForm.reset();
          showToast("Appointment request submitted to reception!");
        } catch (err) {
          showToast("Failed to book: " + err.message, "error");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerText = "Submit Consultation Request";
        }
      });
    }
  }

  // ==========================================================
  // 2. DOCTOR CONSULTATION DESK (DOCTOR QUEUE)
  // ==========================================================
  const docTableBody = document.getElementById("doctorTableBody");
  if (docTableBody) {
    let currentAppointments = [];

    ClinicStore.subscribeAppointments((appointments) => {
      currentAppointments = appointments;

      const todayStr = new Date().toISOString().split("T")[0];
      const todayApts = appointments.filter(a => a.date === todayStr);
      const waitingList = appointments.filter(a => a.status === "Confirmed");
      const completedList = appointments.filter(a => a.status === "Completed");

      if (document.getElementById("docStatTotal")) document.getElementById("docStatTotal").innerText = todayApts.length;
      if (document.getElementById("docStatWaiting")) document.getElementById("docStatWaiting").innerText = waitingList.length;
      if (document.getElementById("docStatDone")) document.getElementById("docStatDone").innerText = completedList.length;

      const presets = ClinicStore.getDiseasePresets();
      docTableBody.innerHTML = "";

      if (waitingList.length === 0) {
        docTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-8">No patients currently waiting in consultation queue.</td></tr>`;
      } else {
        waitingList.forEach(apt => {
          const vitalsDisplay = `${apt.gender || 'N/A'} • ${apt.weight ? apt.weight + ' kg' : 'Wt: N/A'}`;
          docTableBody.innerHTML += `
            <tr>
              <td>
                <strong>${apt.name}</strong> <span class="text-xs text-gray-500">(${apt.age} yrs)</span><br>
                <span class="inline-block bg-[#eef5f0] text-[#284d43] px-2 py-0.5 rounded text-[11px] font-bold mt-1">⚖️ ${vitalsDisplay}</span><br>
                <small class="text-gray-500">📞 ${apt.phone || 'N/A'}</small><br>
                <small class="text-gray-400">ID: ${apt.id.substring(0, 8)}</small>
              </td>
              <td>
                <span class="text-xs font-bold text-[#d99a21]">Booked: ${apt.bookingTime || 'N/A'}</span><br>
                <strong class="text-[#284d43] text-sm">${apt.slot}</strong><br>
                <small class="text-gray-500">${apt.place}</small>
              </td>
              <td>
                <div class="bg-[#eef5f0] border border-[#bfcfc5] rounded-lg p-2 mb-2 flex items-center gap-2">
                  <label class="text-xs font-bold text-[#284d43] whitespace-nowrap">⚡ Select Protocol:</label>
                  <select class="w-full p-1 text-xs rounded border border-[#bfcfc5]" onchange="applyDiseasePreset('${apt.id}', this.value)">
                    <option value="">-- Choose Disease to Auto-Load Prescription --</option>
                    ${presets.map(p => `<option value="${p.diseaseName}">${p.diseaseName}</option>`).join('')}
                  </select>
                </div>
                <textarea id="diag-${apt.id}" class="form-control text-xs py-2 mb-2" rows="2" placeholder="Clinical notes...">${apt.diagnosis || ''}</textarea>
                <div class="rx-builder">
                  <div class="flex justify-between items-center mb-1">
                    <strong class="text-xs">Medications</strong>
                    <button type="button" class="primary-button py-0.5 px-2 text-xs" onclick="addMedicineRow('${apt.id}')">+ Drug</button>
                  </div>
                  <table class="rx-table">
                    <thead>
                      <tr><th>Drug</th><th>Dose</th><th>Freq</th><th>Days</th><th>Instructions</th><th></th></tr>
                    </thead>
                    <tbody id="rx-rows-${apt.id}">
                      <tr>
                        <td><input type="text" class="rx-input rx-name" placeholder="Drug name" /></td>
                        <td><input type="text" class="rx-input rx-dose" placeholder="1 Tab" /></td>
                        <td><input type="text" class="rx-input rx-freq" placeholder="1-0-1" /></td>
                        <td><input type="text" class="rx-input rx-dur" placeholder="10 Days" /></td>
                        <td><input type="text" class="rx-input rx-inst" placeholder="After food" /></td>
                        <td><button type="button" class="btn-del-row" onclick="this.closest('tr').remove()">✕</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
              <td>
                <button class="primary-button py-2 px-3 text-xs w-full" onclick="saveAndPrintPrescription('${apt.id}')">🖨️ Finalize & Print</button>
              </td>
            </tr>
          `;
        });
      }

      const historyTable = document.getElementById("doctorHistoryTableBody");
      if (historyTable) {
        historyTable.innerHTML = "";
        if (completedList.length === 0) {
          historyTable.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-6">No consultations completed yet today.</td></tr>`;
        } else {
          completedList.forEach(apt => {
            const meds = (apt.medicines || []).map(m => `${m.name} (${m.freq})`).join(", ") || "No oral/topical medicines";
            historyTable.innerHTML += `
              <tr>
                <td><strong>${apt.name}</strong> <span class="text-xs text-gray-500">(${apt.age} yrs • ${apt.gender || ''})</span><br><small class="text-gray-400">ID: ${apt.id.substring(0, 8)}</small></td>
                <td><strong class="text-[#284d43]">${apt.slot}</strong></td>
                <td><span class="text-xs">${apt.diagnosis || 'Completed'}</span></td>
                <td><span class="text-xs text-gray-600">${meds}</span></td>
                <td><button class="btn-outline py-1 px-3 text-xs" onclick="reprintPrescription('${apt.id}')">🖨️ Reprint</button></td>
              </tr>
            `;
          });
        }
      }
    });

    window.applyDiseasePreset = (aptId, selectedDisease) => {
      const presets = ClinicStore.getDiseasePresets();
      const preset = presets.find(p => p.diseaseName === selectedDisease);
      if (!preset) return;
      document.getElementById(`diag-${aptId}`).value = preset.notes;
      document.getElementById(`rx-rows-${aptId}`).innerHTML = preset.medicines.map(m => `
        <tr>
          <td><input type="text" class="rx-input rx-name" value="${m.name}" /></td>
          <td><input type="text" class="rx-input rx-dose" value="${m.dosage}" /></td>
          <td><input type="text" class="rx-input rx-freq" value="${m.freq}" /></td>
          <td><input type="text" class="rx-input rx-dur" value="${m.duration}" /></td>
          <td><input type="text" class="rx-input rx-inst" value="${m.inst}" /></td>
          <td><button type="button" class="btn-del-row" onclick="this.closest('tr').remove()">✕</button></td>
        </tr>
      `).join('');
    };

    window.addMedicineRow = (aptId) => {
      const tbody = document.getElementById(`rx-rows-${aptId}`);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="text" class="rx-input rx-name" placeholder="Drug name" /></td>
        <td><input type="text" class="rx-input rx-dose" placeholder="1 Tab" /></td>
        <td><input type="text" class="rx-input rx-freq" placeholder="1-0-1" /></td>
        <td><input type="text" class="rx-input rx-dur" placeholder="10 Days" /></td>
        <td><input type="text" class="rx-input rx-inst" placeholder="After food" /></td>
        <td><button type="button" class="btn-del-row" onclick="this.closest('tr').remove()">✕</button></td>
      `;
      tbody.appendChild(tr);
    };

    window.saveAndPrintPrescription = async (aptId) => {
      const diag = document.getElementById(`diag-${aptId}`).value;
      const rows = document.querySelectorAll(`#rx-rows-${aptId} tr`);
      const meds = [];
      rows.forEach(r => {
        const name = r.querySelector(".rx-name")?.value.trim();
        if (name) {
          meds.push({
            name,
            dosage: r.querySelector(".rx-dose")?.value.trim() || "-",
            freq: r.querySelector(".rx-freq")?.value.trim() || "-",
            duration: r.querySelector(".rx-dur")?.value.trim() || "-",
            inst: r.querySelector(".rx-inst")?.value.trim() || "-"
          });
        }
      });
      await ClinicStore.updateAppointment(aptId, { diagnosis: diag, medicines: meds, status: "Completed" });
      const apt = currentAppointments.find(a => a.id === aptId);
      if (apt) {
        document.getElementById("printName").innerText = apt.name;
        document.getElementById("printAge").innerText = `${apt.age} yrs • ${apt.gender || ''} ${apt.weight ? '(' + apt.weight + ' kg)' : ''}`;
        document.getElementById("printDate").innerText = apt.date;
        document.getElementById("printId").innerText = apt.id.substring(0, 8);
        document.getElementById("printDiagnosis").innerText = diag || "Consultation complete.";
        document.getElementById("printMedicinesBody").innerHTML = meds.map(m => `
          <tr><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.freq}</td><td>${m.duration}</td><td>${m.inst}</td></tr>
        `).join('') || `<tr><td colspan="5" style="text-align:center;">No medications prescribed.</td></tr>`;
        setTimeout(() => window.print(), 250);
      }
    };

    window.reprintPrescription = (aptId) => {
      const apt = currentAppointments.find(a => a.id === aptId);
      if (!apt) return;
      document.getElementById("printName").innerText = apt.name;
      document.getElementById("printAge").innerText = `${apt.age} yrs • ${apt.gender || ''} ${apt.weight ? '(' + apt.weight + ' kg)' : ''}`;
      document.getElementById("printDate").innerText = apt.date;
      document.getElementById("printId").innerText = apt.id.substring(0, 8);
      document.getElementById("printDiagnosis").innerText = apt.diagnosis || "Consultation complete.";
      document.getElementById("printMedicinesBody").innerHTML = (apt.medicines || []).map(m => `
        <tr><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.freq}</td><td>${m.duration}</td><td>${m.inst}</td></tr>
      `).join('') || `<tr><td colspan="5" style="text-align:center;">No medications prescribed.</td></tr>`;
      setTimeout(() => window.print(), 250);
    };
  }

  // ==========================================================
  // 3. ADMIN CMS: TABS, BAR GRAPH & CONTENT MANAGEMENT
  // ==========================================================
  const adminNav = document.getElementById("adminTabsNav");
  if (adminNav) {
    let allAppointmentsCache = [];
    let currentChartRange = "daily";
    let chartInstance = null;

    // 1. Dashboard Tab Switcher
    window.switchAdminTab = (tabName) => {
      document.querySelectorAll(".admin-tab-btn").forEach(btn => {
        btn.className = "admin-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-[#456057] border border-[#d8ded5] hover:bg-[#edf3ee] transition";
      });
      const activeBtn = document.getElementById(`tabBtn-${tabName}`);
      if (activeBtn) {
        activeBtn.className = "admin-tab-btn active px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#284d43] text-white shadow-sm transition";
      }

      document.querySelectorAll(".admin-tab-pane").forEach(pane => pane.classList.add("hidden"));
      const activePane = document.getElementById(`tabPane-${tabName}`);
      if (activePane) activePane.classList.remove("hidden");
    };

    // 2. Bar Chart Granularity Switcher
    window.setChartRange = (range) => {
      currentChartRange = range;
      ["daily", "weekly", "monthly"].forEach(r => {
        const btn = document.getElementById(`rangeBtn-${r}`);
        if (btn) {
          if (r === range) {
            btn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#284d43] text-white shadow-xs transition";
          } else {
            btn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#456057] hover:bg-white transition";
          }
        }
      });
      renderAnalyticsChart();
    };

    // 3. Compute Data and Render Chart.js
    function renderAnalyticsChart() {
      const canvas = document.getElementById("appointmentChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      let labels = [];
      let totalData = [];
      let completedData = [];

      const now = new Date();

      if (currentChartRange === "daily") {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const isoDate = d.toISOString().split("T")[0];
          const displayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          labels.push(displayLabel);

          const dayApts = allAppointmentsCache.filter(a => a.date === isoDate);
          totalData.push(dayApts.length);
          completedData.push(dayApts.filter(a => a.status === "Completed").length);
        }
      } else if (currentChartRange === "weekly") {
        // Last 4 distinct 7-day windows
        for (let w = 3; w >= 0; w--) {
          const start = new Date(now);
          start.setDate(now.getDate() - (w * 7 + 6));
          const end = new Date(now);
          end.setDate(now.getDate() - (w * 7));

          const label = `${start.getDate()} ${start.toLocaleDateString("en-US", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("en-US", { month: "short" })}`;
          labels.push(w === 0 ? "This Week" : label);

          const weekApts = allAppointmentsCache.filter(a => {
            if (!a.timestamp) return false;
            return a.timestamp >= start.setHours(0, 0, 0, 0) && a.timestamp <= end.setHours(23, 59, 59, 999);
          });
          totalData.push(weekApts.length);
          completedData.push(weekApts.filter(a => a.status === "Completed").length);
        }
      } else if (currentChartRange === "monthly") {
        // Months of Current Year (Jan - Dec)
        const currentYear = now.getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        labels = monthNames;

        monthNames.forEach((_, idx) => {
          const monthStr = String(idx + 1).padStart(2, "0");
          const prefix = `${currentYear}-${monthStr}`;
          const monthApts = allAppointmentsCache.filter(a => (a.date || "").startsWith(prefix));
          totalData.push(monthApts.length);
          completedData.push(monthApts.filter(a => a.status === "Completed").length);
        });
      }

      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Total Bookings",
              data: totalData,
              backgroundColor: "rgba(40, 77, 67, 0.85)",
              borderColor: "#17342c",
              borderWidth: 1.5,
              borderRadius: 6,
              barPercentage: 0.65
            },
            {
              label: "Completed Consultations",
              data: completedData,
              backgroundColor: "rgba(217, 154, 33, 0.85)",
              borderColor: "#a67313",
              borderWidth: 1.5,
              borderRadius: 6,
              barPercentage: 0.65
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                font: { family: "DM Sans", weight: "bold", size: 12 },
                color: "#24342f"
              }
            },
            tooltip: {
              backgroundColor: "#17342c",
              padding: 10,
              titleFont: { family: "DM Sans", weight: "bold" },
              bodyFont: { family: "DM Sans" }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: "#587067", font: { family: "DM Sans" } },
              grid: { color: "#edf3ee" }
            },
            x: {
              ticks: { color: "#24342f", font: { family: "DM Sans", weight: "600" } },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 4. Subscribe Appointments & Compute Metrics
    ClinicStore.subscribeAppointments((appointments) => {
      allAppointmentsCache = appointments;

      const total = appointments.length;
      const completed = appointments.filter(a => a.status === "Completed").length;
      const walkins = appointments.filter(a => (a.slot || "").toLowerCase().includes("walk-in")).length;
      const cancelled = appointments.filter(a => a.status === "Cancelled" || a.status === "Not Visited").length;

      if (document.getElementById("statTotalAll")) document.getElementById("statTotalAll").innerText = total;
      if (document.getElementById("statCompletedAll")) document.getElementById("statCompletedAll").innerText = completed;
      if (document.getElementById("statWalkinAll")) document.getElementById("statWalkinAll").innerText = walkins;
      if (document.getElementById("statCancelledAll")) document.getElementById("statCancelledAll").innerText = cancelled;

      renderAnalyticsChart();
    });

    // 5. Render Treatments
    const adminTreatmentsBody = document.getElementById("adminTreatmentsListBody");
    if (adminTreatmentsBody) {
      ClinicStore.subscribeTreatments((treatments) => {
        adminTreatmentsBody.innerHTML = treatments.map(t => `
          <tr>
            <td><span class="badge badge-confirmed">${t.category}</span></td>
            <td><strong>${t.title}</strong></td>
            <td>
              <p class="text-xs text-gray-700">${t.desc}</p>
              <ul class="text-[11px] text-[#284d43] mt-1 list-disc list-inside">
                ${(t.benefits || []).map(b => `<li>${b}</li>`).join('')}
              </ul>
            </td>
            <td>
              <div class="flex gap-2">
                <img src="${t.beforeImg}" alt="Before" class="w-12 h-12 object-cover rounded border" title="Before" />
                <img src="${t.afterImg}" alt="After" class="w-12 h-12 object-cover rounded border" title="After Care" />
              </div>
            </td>
            <td><button class="btn-danger text-xs py-1 px-3" onclick="deleteTreatment('${t.id}')">Delete</button></td>
          </tr>
        `).join('');
      });

      window.openAddTreatmentModal = () => document.getElementById("addTrtModal").classList.add("active");
      window.closeAddTreatmentModal = () => document.getElementById("addTrtModal").classList.remove("active");

      document.getElementById("addTreatmentFullForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById("saveTreatmentBtn");
        saveBtn.disabled = true;
        saveBtn.innerText = "Publishing...";

        try {
          const beforeFile = document.getElementById("newTrtBeforeFile").files[0];
          const afterFile = document.getElementById("newTrtAfterFile").files[0];
          const beforeDataUrl = await readFileAsDataURL(beforeFile);
          const afterDataUrl = await readFileAsDataURL(afterFile);

          const rawBenefits = document.getElementById("newTrtBenefits").value;
          const benefitsArray = rawBenefits.split("\n").map(b => b.trim()).filter(b => b.length > 0);

          await ClinicStore.saveTreatment({
            category: document.getElementById("newTrtCategory").value,
            title: document.getElementById("newTrtTitle").value.trim(),
            desc: document.getElementById("newTrtDesc").value.trim(),
            benefits: benefitsArray,
            beforeImg: beforeDataUrl,
            afterImg: afterDataUrl
          });

          document.getElementById("addTreatmentFullForm").reset();
          closeAddTreatmentModal();
          showToast("Treatment published live to the patient site!");
        } catch (err) {
          showToast("Failed to upload: " + err.message, "error");
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerText = "Publish Treatment to Website";
        }
      });

      window.deleteTreatment = async (id) => {
        if (confirm("Delete this treatment from the clinic portfolio?")) {
          await ClinicStore.deleteTreatment(id);
        }
      };
    }

    // 6. Sub-tables (Presets, Doctors, Premises)
    function renderAdminSubTables() {
      const presets = ClinicStore.getDiseasePresets();
      document.getElementById("adminPresetsBody").innerHTML = presets.map(p => `
        <tr>
          <td><strong>${p.diseaseName}</strong></td>
          <td><span class="text-xs text-gray-600">${p.notes}</span></td>
          <td><span class="text-xs">${(p.medicines || []).map(m => m.name).join(", ") || 'No tablets'}</span></td>
          <td><button class="btn-danger text-xs py-1 px-3" onclick="deletePreset('${p.diseaseName}')">Delete</button></td>
        </tr>
      `).join('');

      const docs = ClinicStore.getDoctors();
      document.getElementById("adminDoctorsBody").innerHTML = docs.map(d => `
        <tr>
          <td><img src="${d.img || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80'}" alt="${d.name}" class="w-10 h-10 object-cover rounded-full border border-[#bfcfc5]" /></td>
          <td><strong>${d.name}</strong><br><small class="text-xs text-gray-500">${d.qualifications || ''}</small></td>
          <td class="text-xs">${d.role}</td>
          <td><button class="btn-danger text-xs py-1 px-2.5" onclick="deleteDoctor('${d.id}')">Delete</button></td>
        </tr>
      `).join('');

      const premises = ClinicStore.getPremises();
      document.getElementById("adminPremisesBody").innerHTML = premises.map(p => `
        <tr>
          <td><img src="${p.img || 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=700&q=80'}" alt="${p.title}" class="w-12 h-9 object-cover rounded border border-[#bfcfc5]" /></td>
          <td><span class="badge badge-confirmed">${p.tag}</span></td>
          <td><strong class="text-xs">${p.title}</strong></td>
          <td><button class="btn-danger text-xs py-1 px-2.5" onclick="deletePremise('${p.id}')">Delete</button></td>
        </tr>
      `).join('');
    }

    window.deletePreset = (name) => { ClinicStore.deleteDiseasePreset(name); renderAdminSubTables(); };
    window.deleteDoctor = (id) => { ClinicStore.deleteDoctor(id); renderAdminSubTables(); };
    window.deletePremise = (id) => { ClinicStore.deletePremise(id); renderAdminSubTables(); };

    // Protocol Modal & Excel
    window.openAddPresetModal = () => document.getElementById("addPresetModal").classList.add("active");
    window.closeAddPresetModal = () => document.getElementById("addPresetModal").classList.remove("active");
    window.addPresetMedicineRow = () => {
      const tbody = document.getElementById("newPresetMedRows");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="text" class="rx-input p-name" placeholder="Drug name" required /></td>
        <td><input type="text" class="rx-input p-dose" placeholder="1 Tab" /></td>
        <td><input type="text" class="rx-input p-freq" placeholder="1-0-1" /></td>
        <td><input type="text" class="rx-input p-dur" placeholder="15 Days" /></td>
        <td><input type="text" class="rx-input p-inst" placeholder="After food" /></td>
        <td><button type="button" class="btn-del-row" onclick="this.closest('tr').remove()">✕</button></td>
      `;
      tbody.appendChild(tr);
    };

    document.getElementById("addPresetForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const meds = [];
      document.querySelectorAll("#newPresetMedRows tr").forEach(r => {
        const name = r.querySelector(".p-name")?.value.trim();
        if (name) {
          meds.push({
            name,
            dosage: r.querySelector(".p-dose")?.value.trim() || "-",
            freq: r.querySelector(".p-freq")?.value.trim() || "-",
            duration: r.querySelector(".p-dur")?.value.trim() || "-",
            inst: r.querySelector(".p-inst")?.value.trim() || "-"
          });
        }
      });
      ClinicStore.saveDiseasePreset({
        diseaseName: document.getElementById("newPresetDisease").value.trim(),
        notes: document.getElementById("newPresetNotes").value.trim(),
        medicines: meds
      });
      document.getElementById("addPresetForm").reset();
      closeAddPresetModal();
      showToast("Protocol saved!");
      renderAdminSubTables();
    });

    document.getElementById("excelFileInput")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          const parsed = json.map(row => ({
            diseaseName: row["Disease"] || row["Disease Name"] || "Condition",
            notes: row["Notes"] || row["Diagnosis"] || "",
            medicines: (row["Medicines"] || "").split(";").map(m => {
              const parts = m.split("-").map(p => p.trim());
              return { name: parts[0] || m, dosage: parts[1] || "1 Tab", freq: parts[2] || "1-0-1", duration: parts[3] || "10 Days", inst: parts[4] || "After food" };
            })
          }));
          ClinicStore.bulkImportPresets(parsed);
          showToast(`Imported ${parsed.length} disease protocols from spreadsheet!`);
          renderAdminSubTables();
        } catch (err) {
          showToast("Failed to parse Excel file", "error");
        }
      };
      reader.readAsArrayBuffer(file);
    });

    // Doctor Add Handler with Photo
    window.openAddDoctorModal = () => document.getElementById("addDocModal").classList.add("active");
    window.closeAddDoctorModal = () => document.getElementById("addDocModal").classList.remove("active");
    document.getElementById("addDocForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("saveDoctorBtn");
      saveBtn.disabled = true;
      saveBtn.innerText = "Saving Doctor...";

      try {
        const photoFile = document.getElementById("newDocPhotoFile")?.files[0];
        let photoUrl = "";
        if (photoFile) photoUrl = await readFileAsDataURL(photoFile);

        ClinicStore.addDoctor({
          name: document.getElementById("newDocName").value.trim(),
          qualifications: document.getElementById("newDocQual").value.trim(),
          timings: document.getElementById("newDocTimings").value.trim(),
          role: document.getElementById("newDocRole").value.trim(),
          img: photoUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80"
        });

        document.getElementById("addDocForm").reset();
        closeAddDoctorModal();
        showToast("Doctor profile added successfully!");
        renderAdminSubTables();
      } catch (err) {
        showToast("Error adding doctor: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Doctor";
      }
    });

    // Premises Add Handler with Photo
    window.openAddPremiseModal = () => document.getElementById("addPremiseModal").classList.add("active");
    window.closeAddPremiseModal = () => document.getElementById("addPremiseModal").classList.remove("active");
    document.getElementById("addPremiseForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("savePremiseBtn");
      saveBtn.disabled = true;
      saveBtn.innerText = "Saving Room...";

      try {
        const photoFile = document.getElementById("newPremisePhotoFile")?.files[0];
        let photoUrl = "";
        if (photoFile) photoUrl = await readFileAsDataURL(photoFile);

        ClinicStore.addPremise({
          tag: document.getElementById("newPremiseTag").value.trim(),
          title: document.getElementById("newPremiseTitle").value.trim(),
          desc: document.getElementById("newPremiseDesc").value.trim(),
          checklist: document.getElementById("newPremiseChecklist").value.trim(),
          img: photoUrl || "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=700&q=80"
        });

        document.getElementById("addPremiseForm").reset();
        closeAddPremiseModal();
        showToast("Hospital room added successfully!");
        renderAdminSubTables();
      } catch (err) {
        showToast("Error adding room: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Room";
      }
    });

    // Logo Upload
    document.getElementById("updateLogoForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const file = document.getElementById("newLogoFile").files[0];
      if (!file) return;
      const b64 = await readFileAsDataURL(file);
      await ClinicStore.updateSettings({ logoUrl: b64 });
      document.getElementById("updateLogoForm").reset();
      showToast("Clinic logo updated globally!");
    });

    renderAdminSubTables();
  }

  // ==========================================================
  // 4. RECEPTIONIST DESK (WEIGHT, GENDER & QUEUE TRIAGE)
  // ==========================================================
  const recTableBody = document.getElementById("receptionistTableBody");
  if (recTableBody) {
    let latestAppointments = [];

    const toggleBtn = document.getElementById("toggleAvailabilityBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async () => {
        const currentlyOpen = toggleBtn.dataset.isOpen === "true";
        await ClinicStore.updateSettings({ isBookingOpen: !currentlyOpen });
      });
    }

    // 1. OPEN WEIGHT & GENDER MODAL
    window.openVitalsModal = (id) => {
      const apt = latestAppointments.find(a => a.id === id);
      if (!apt) return;

      document.getElementById("vitalsAptId").value = id;
      document.getElementById("vitalsPatientNameDisplay").innerText = `Patient: ${apt.name} (${apt.age} yrs) • Phone: ${apt.phone || 'N/A'}`;
      document.getElementById("vitalsGender").value = apt.gender || "Female";
      document.getElementById("vitalsWeight").value = apt.weight || "";
      document.getElementById("vitalsModal").classList.add("active");
    };

    window.closeVitalsModal = () => {
      document.getElementById("vitalsModal").classList.remove("active");
    };

    // 2. SAVE WEIGHT & GENDER TO FIRESTORE
    window.savePatientVitals = async () => {
      const id = document.getElementById("vitalsAptId").value;
      const gender = document.getElementById("vitalsGender").value;
      const weight = document.getElementById("vitalsWeight").value.trim();

      await ClinicStore.updateAppointment(id, {
        gender: gender,
        weight: weight
      });

      closeVitalsModal();
      showToast("Weight and Gender updated successfully!");
    };

    // 3. ASSIGN TO DOCTOR MODAL
    window.openAssignModal = (id) => {
      const apt = latestAppointments.find(a => a.id === id);
      if (!apt) return;

      document.getElementById("assignAptId").value = id;
      document.getElementById("assignPatientNameDisplay").innerText = `Patient: ${apt.name} (${apt.age} yrs)`;
      document.getElementById("assignDoctorModal").classList.add("active");
    };

    window.closeAssignModal = () => {
      document.getElementById("assignDoctorModal").classList.remove("active");
    };

    window.confirmSendToDoctor = async () => {
      const id = document.getElementById("assignAptId").value;
      const slot = document.getElementById("assignedTimeSlot").value;

      await ClinicStore.updateAppointment(id, {
        status: "Confirmed",
        slot: slot
      });

      closeAssignModal();
      showToast("Patient sent to Doctor's active queue!");
    };

    // 4. MARK NOT VISITED
    window.markNotVisited = async (id) => {
      if (confirm("Mark this patient as Not Visited? They will not appear on the doctor's screen.")) {
        await ClinicStore.updateAppointment(id, {
          status: "Not Visited",
          slot: "Did Not Visit"
        });
        showToast("Marked as Not Visited", "error");
      }
    };

    // 5. WALK-IN REGISTRATION
    window.openWalkinModal = () => {
      document.getElementById("wTime").value = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      document.getElementById("walkinModal").classList.add("active");
    };
    window.closeWalkinModal = () => document.getElementById("walkinModal").classList.remove("active");
    document.getElementById("openWalkinModalBtn")?.addEventListener("click", openWalkinModal);

    document.getElementById("walkinForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const timeInput = document.getElementById("wTime").value;
      const [h, m] = timeInput.split(":");
      const wDate = new Date();
      wDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

      await ClinicStore.saveAppointment({
        name: document.getElementById("wName").value.trim(),
        phone: document.getElementById("wPhone")?.value.trim() || "",
        age: document.getElementById("wAge").value.trim(),
        gender: document.getElementById("wGender").value,
        weight: document.getElementById("wWeight").value.trim(),
        place: document.getElementById("wPlace").value.trim(),
        bookingTime: wDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: wDate.getTime(),
        slot: "Direct Walk-In",
        date: wDate.toISOString().split("T")[0],
        status: "Pending"
      });

      document.getElementById("walkinForm").reset();
      closeWalkinModal();
      showToast("Walk-in patient registered! Update vitals or send to doctor.");
    });

    // 6. RENDER RECEPTIONIST TABLE WITH SERIAL NUMBERS & VITALS BUTTON
    ClinicStore.subscribeAppointments((appointments) => {
      latestAppointments = appointments;
      const sortedAppointments = [...appointments].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      if (sortedAppointments.length === 0) {
        recTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-gray-500 py-8">No appointments found for today.</td></tr>`;
        return;
      }

      recTableBody.innerHTML = sortedAppointments.map((apt, index) => {
        const serialNo = index + 1;
        const vitalsRecorded = apt.weight || apt.gender;
        const vitalsDisplay = vitalsRecorded 
          ? `<span class="font-bold text-[#284d43]">${apt.gender || '—'} • ${apt.weight ? apt.weight + ' kg' : 'No Weight'}</span>`
          : `<span class="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">⚠️ Vitals Pending</span>`;

        let actionHtml = '';
        if (apt.status === 'Pending') {
          actionHtml = `
            <button class="primary-button text-xs py-1.5 px-3 mr-1 font-bold" onclick="openAssignModal('${apt.id}')">Assign to Doctor</button>
            <button class="btn-danger py-1.5 px-2.5 text-xs font-bold" onclick="markNotVisited('${apt.id}')">Not Visited</button>
          `;
        } else if (apt.status === 'Confirmed') {
          actionHtml = `
            <span class="badge badge-confirmed font-bold mr-1">With Doctor</span>
            <button class="btn-danger py-1 px-2 text-[10px]" onclick="markNotVisited('${apt.id}')">Not Visited</button>
          `;
        } else if (apt.status === 'Not Visited') {
          actionHtml = `<span class="badge badge-cancelled font-bold">Not Visited</span>`;
        } else if (apt.status === 'Completed') {
          actionHtml = `<span class="badge badge-completed font-bold">Completed</span>`;
        } else {
          actionHtml = `<span class="text-xs text-gray-400 font-bold">${apt.status}</span>`;
        }

        return `
          <tr>
            <td>
              <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#eef5f0] text-[#284d43] font-bold text-sm border border-[#bfcfc5]">
                #${serialNo}
              </span>
            </td>
            <td>
              <strong>${apt.name}</strong> <span class="text-xs text-gray-500">(${apt.age} yrs)</span><br>
              <small class="text-gray-500">📞 ${apt.phone || 'N/A'}</small>
            </td>
            <td>
              <div>${vitalsDisplay}</div>
              <button class="btn-outline text-[11px] py-1 px-2.5 mt-1 font-bold inline-flex items-center gap-1 hover:bg-[#284d43] hover:text-white transition" onclick="openVitalsModal('${apt.id}')">
                ⚖️ Enter / Update Weight & Gender
              </button>
            </td>
            <td><strong class="text-[#d99a21]">${apt.bookingTime || 'N/A'}</strong></td>
            <td>${apt.place}</td>
            <td><strong class="text-[#284d43]">${apt.slot}</strong></td>
            <td><span class="badge badge-${(apt.status || 'pending').toLowerCase().replace(' ', '-')}">${apt.status}</span></td>
            <td>${actionHtml}</td>
          </tr>
        `;
      }).join('');
    });
  }
});