// --- 1. FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCIjKDb915_lA1WKybiL7sX9_9Kr6cFxJU",
  authDomain: "skin-5b77d.firebaseapp.com",
  projectId: "skin-5b77d",
  storageBucket: "skin-5b77d.firebasestorage.app",
  messagingSenderId: "62061409550",
  appId: "1:62061409550:web:51781436abc0501588535f",
  measurementId: "G-PM30JKRP18"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Fallback Keys
const DB_DOCTORS_KEY = "sri_sai_doctors";
const DB_DISEASE_PRESETS_KEY = "sri_sai_disease_presets";
const DB_PREMISES_KEY = "sri_sai_premises";

// Seed Data
const defaultPremises = [
  {
    id: "FAC-1",
    tag: "Laser Suite",
    title: "Sterile Advanced Laser Suite",
    desc: "A temperature-regulated environment housing our Q-Switched Nd:YAG and Artemis-I Diode laser systems.",
    checklist: "UV-sterilized surfaces between sessions\nProtective laser OD7+ eyewear provided"
  },
  {
    id: "FAC-2",
    tag: "Minor OT",
    title: "Dermatological Minor Surgery Theatre",
    desc: "Equipped for Fractional CO2 laser vaporizations, wart excisions, and scar subcisions.",
    checklist: "Shadowless overhead lighting\nHospital-grade smoke evacuators"
  }
];

const defaultDiseasePresets = [
  {
    diseaseName: "Melasma & Facial Hyperpigmentation",
    notes: "Epidermal and dermal melasma patches. Recommended laser toning and sun protection.",
    medicines: [
      { name: "Kojic & Azelaic Acid 10% Cream", dosage: "Pea size", freq: "0-0-1", duration: "30 Days", inst: "Apply only at night" },
      { name: "Mineral Sunscreen Gel SPF 50+", dosage: "Generous", freq: "1-1-0", duration: "Daily", inst: "Reapply every 3-4 hours" }
    ]
  },
  {
    diseaseName: "Acne Vulgaris (Grade II/III)",
    notes: "Active inflammatory papules and comedones.",
    medicines: [
      { name: "Clindamycin 1% + Adapalene 0.1% Gel", dosage: "Thin layer", freq: "0-0-1", duration: "20 Days", inst: "Apply at night" },
      { name: "Tab. Doxycycline 100mg", dosage: "1 Cap", freq: "1-0-1", duration: "10 Days", inst: "Take with full meal" }
    ]
  }
];



// --- 2. CLINIC STORE (LIVE DATABASE ENGINE) ---
class ClinicStore {
  
  // Real-Time Treatments Collection
  static subscribeTreatments(callback) {
    return db.collection("treatments").onSnapshot(
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        callback(list);
      },
      (err) => console.error("Treatments listener error:", err)
    );
  }

  static async saveTreatment(data) {
    try {
      const docRef = await db.collection("treatments").add({
        category: data.category,
        title: data.title,
        desc: data.desc,
        benefits: data.benefits || [],
        beforeImg: data.beforeImg,
        afterImg: data.afterImg,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (err) {
      showToast("Error saving treatment: " + err.message, "error");
      throw err;
    }
  }

  static async deleteTreatment(id) {
    try {
      await db.collection("treatments").doc(id).delete();
      showToast("Treatment deleted.");
    } catch (err) {
      showToast("Error deleting: " + err.message, "error");
    }
  }

  // Real-time Settings & Logo
  static subscribeSettings(callback) {
    return db.collection("settings").doc("general").onSnapshot(
      (doc) => callback(doc.exists ? doc.data() : {}),
      (err) => console.error(err)
    );
  }

  static async updateSettings(updates) {
    try {
      await db.collection("settings").doc("general").set(updates, { merge: true });
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    }
  }

  // Real-time Appointments
  static subscribeAppointments(callback) {
    return db.collection("appointments").orderBy("timestamp", "asc").onSnapshot(
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        callback(list);
      },
      (err) => console.error(err)
    );
  }

  static async saveAppointment(data) {
    const payload = {
      name: data.name || "",
      phone: data.phone || "",
      age: data.age || "",
      gender: data.gender || "",
      weight: data.weight || "",
      place: data.place || "",
      bookingTime: data.bookingTime || "",
      slot: data.slot || "Awaiting Reception Slot",
      diagnosis: data.diagnosis || "",
      medicines: data.medicines || [],
      date: data.date || new Date().toISOString().split("T")[0],
      status: data.status || "Pending",
      timestamp: data.timestamp || Date.now()
    };
    return await db.collection("appointments").add(payload);
  }

  static async updateAppointment(id, updates) {
    return await db.collection("appointments").doc(id).update(updates);
  }

  // Local Admin Helpers
  static getDiseasePresets() {
    const raw = localStorage.getItem(DB_DISEASE_PRESETS_KEY);
    return raw ? JSON.parse(raw) : defaultDiseasePresets;
  }
  static saveDiseasePreset(preset) {
    const list = this.getDiseasePresets();
    list.push(preset);
    localStorage.setItem(DB_DISEASE_PRESETS_KEY, JSON.stringify(list));
  }
  static deleteDiseasePreset(name) {
    const list = this.getDiseasePresets().filter(p => p.diseaseName !== name);
    localStorage.setItem(DB_DISEASE_PRESETS_KEY, JSON.stringify(list));
  }
  static bulkImportPresets(newPresetsList) {
    const current = this.getDiseasePresets();
    newPresetsList.forEach(np => current.push(np));
    localStorage.setItem(DB_DISEASE_PRESETS_KEY, JSON.stringify(current));
  }

  static getDoctors() {
    const raw = localStorage.getItem(DB_DOCTORS_KEY);
    return raw ? JSON.parse(raw) : defaultDoctors;
  }
  static addDoctor(doc) {
    const list = this.getDoctors();
    list.push({ ...doc, id: "DOC-" + (list.length + 1) });
    localStorage.setItem(DB_DOCTORS_KEY, JSON.stringify(list));
  }
  static deleteDoctor(id) {
    const list = this.getDoctors().filter(d => d.id !== id);
    localStorage.setItem(DB_DOCTORS_KEY, JSON.stringify(list));
  }

  static getPremises() {
    const raw = localStorage.getItem(DB_PREMISES_KEY);
    return raw ? JSON.parse(raw) : defaultPremises;
  }
  static addPremise(fac) {
    const list = this.getPremises();
    list.push({ ...fac, id: "FAC-" + (list.length + 1) });
    localStorage.setItem(DB_PREMISES_KEY, JSON.stringify(list));
  }
  static deletePremise(id) {
    const list = this.getPremises().filter(f => f.id !== id);
    localStorage.setItem(DB_PREMISES_KEY, JSON.stringify(list));
  }
}

function showToast(msg, type = "success") {
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerText = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}