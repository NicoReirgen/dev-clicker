// jeu.js — toute la logique de ton jeu.
// Alpine.js s'occupe du reste : dès qu'une donnée change, la page se met à jour toute seule.

const CLE_SAUVEGARDE = "dev-clicker:" + location.pathname;
const MAX_CURSEURS = 12;
const MAX_BUGS = 5;

function jeu() {
  return {
    // --- Personnalise ton jeu ici ---
    unite: "lignes de code",
    iconeClic: "⌨️",
    ameliorations: [
      { id: "cafe", icone: "☕", nom: "Café", prix: 15, parClic: 1, parSeconde: 0, nombre: 0 },
      { id: "stagiaire", icone: "🧑‍🎓", nom: "Stagiaire", prix: 50, parClic: 0, parSeconde: 1, nombre: 0 },
      { id: "souris", icone: "🖱️", nom: "Souris gamer", prix: 250, parClic: 5, parSeconde: 0, nombre: 0 },
      { id: "senior", icone: "🧙", nom: "Dev senior", prix: 600, parClic: 0, parSeconde: 8, nombre: 0 },
      { id: "ia", icone: "🤖", nom: "Assistant IA", prix: 4000, parClic: 0, parSeconde: 50, nombre: 0 },
      { id: "datacenter", icone: "🏭", nom: "Data center", prix: 25000, parClic: 0, parSeconde: 300, nombre: 0 },
    ],
    succes: [
      { id: "hello", nom: "Hello world : 1er clic", condition: (j) => j.clics >= 1 },
      { id: "script", nom: "Premier script : 100 lignes", condition: (j) => j.total >= 100 },
      { id: "equipe", nom: "Chef d'équipe : 10 par seconde", condition: (j) => j.parSeconde >= 10 },
      { id: "projet", nom: "Projet de BTS : 1 000 lignes", condition: (j) => j.total >= 1000 },
      { id: "acharne", nom: "Clic infatigable : 500 clics", condition: (j) => j.clics >= 500 },
      { id: "startup", nom: "Startup : 100 000 lignes", condition: (j) => j.total >= 100000 },
      { id: "debug", nom: "Débogueur : 10 bugs corrigés", condition: (j) => j.bugsCorriges >= 10 },
    ],

    // --- L'état de la partie ---
    lignes: 0,
    total: 0,
    clics: 0,
    succesObtenus: [],
    notification: "",
    bulles: [],
    bugs: [],
    bugsCorriges: 0,
    efface: false,

    get parClic() {
      return 1 + this.ameliorations.reduce((somme, a) => somme + a.parClic * a.nombre, 0);
    },

    // Chaque bug actif divise la production par 2 : 1 bug → ÷ 2, 2 bugs → ÷ 4, 3 bugs → ÷ 8…
    get malus() {
      return Math.pow(2, this.bugs.length);
    },

    get parSeconde() {
      const production = this.ameliorations.reduce((somme, a) => somme + a.parSeconde * a.nombre, 0);
      return production / this.malus;
    },

    // Les curseurs autour de la touche : un curseur par ligne produite chaque seconde.
    // Au-delà de MAX_CURSEURS, on garde 12 curseurs et on répartit la production entre eux :
    // à 13 par seconde, un curseur passe à +2 ; à 24, ils sont tous à +2 ; à 25, un passe à +3…
    get curseurs() {
      const total = Math.floor(this.parSeconde);
      const nombre = Math.min(total, MAX_CURSEURS);
      if (nombre === 0) return [];
      const base = Math.floor(total / nombre);
      const reste = total % nombre;
      const liste = [];
      for (let i = 0; i < nombre; i++) {
        const valeur = base + (i < reste ? 1 : 0);
        liste.push({ valeur, couleur: this.couleurCurseur(valeur) });
      }
      return liste;
    },

    // Plus un curseur vaut cher, plus sa couleur glisse : blanc, jaune, orange, rouge, violet, bleu.
    couleurCurseur(valeur) {
      if (valeur <= 1) return "var(--surface)";
      const progression = Math.min(Math.log10(valeur) / 4, 1); // de 0 (+1) à 1 (+10 000)
      const teinte = 50 - progression * 250;
      return "hsl(" + teinte + " 95% 60%)";
    },

    // Alpine appelle init() automatiquement au chargement de la page.
    init() {
      this.charger();
      setInterval(() => this.gagner(this.parSeconde / 10), 100);
      setInterval(() => this.subirBugs(), 100);
      this.planifierBug();
      setInterval(() => this.sauvegarder(), 5000);
      window.addEventListener("beforeunload", () => this.sauvegarder());
    },

    gagner(quantite) {
      if (quantite <= 0) return;
      this.lignes += quantite;
      this.total += quantite;
      this.verifierSucces();
    },

    cliquer(evenement) {
      this.clics++;
      this.gagner(this.parClic);
      this.ajouterBulle(evenement, "+" + this.formater(this.parClic));
    },

    acheter(amelioration) {
      if (this.lignes < amelioration.prix) return;
      this.lignes -= amelioration.prix;
      amelioration.nombre++;
      amelioration.prix = Math.ceil(amelioration.prix * 1.15);
    },

    description(amelioration) {
      const effets = [];
      if (amelioration.parClic) effets.push("+" + amelioration.parClic + " par clic");
      if (amelioration.parSeconde) effets.push("+" + amelioration.parSeconde + " par seconde");
      return effets.join(" · ");
    },

    formater(nombre) {
      return Math.floor(nombre).toLocaleString("fr-FR");
    },

    verifierSucces() {
      for (const s of this.succes) {
        if (!this.succesObtenus.includes(s.id) && s.condition(this)) {
          this.succesObtenus.push(s.id);
          this.notifier("🏆 Succès débloqué : " + s.nom);
        }
      }
    },

    // --- Le mini-jeu de débogage ---
    // Un bug apparaît au hasard, toutes les 15 à 35 secondes.
    planifierBug() {
      const delai = 15000 + Math.random() * 20000;
      setTimeout(() => {
        this.apparaitreBug();
        this.planifierBug();
      }, delai);
    },

    apparaitreBug() {
      // Pas de bug au tout début de la partie, ni plus de MAX_BUGS à la fois.
      if (this.total < 50 || this.bugs.length >= MAX_BUGS) return;
      this.bugs.push({
        id: Date.now() + Math.random(),
        x: 8 + Math.random() * 84, // position en % de la largeur de la fenêtre
        y: 12 + Math.random() * 76, // position en % de la hauteur
      });
      this.notifier("🐛 Un bug ! Clique dessus pour le corriger.");
    },

    // Toutes les 100 ms, chaque bug efface 0,2 % des lignes : les malus se cumulent.
    subirBugs() {
      if (this.bugs.length === 0) return;
      this.lignes = this.lignes * Math.pow(0.998, this.bugs.length);
    },

    corrigerBug(bug) {
      this.bugs = this.bugs.filter((b) => b.id !== bug.id);
      this.bugsCorriges++;
      this.notifier("✅ Bug corrigé !");
      this.verifierSucces();
    },

    notifier(texte) {
      this.notification = texte;
      clearTimeout(this.minuteurNotification);
      this.minuteurNotification = setTimeout(() => (this.notification = ""), 3000);
    },

    // Fait monter un petit « +1 » là où on a cliqué.
    ajouterBulle(evenement, texte) {
      const cadre = evenement.currentTarget.getBoundingClientRect();
      const id = Date.now() + Math.random();
      this.bulles.push({
        id,
        texte,
        x: evenement.clientX || cadre.left + cadre.width / 2,
        y: evenement.clientY || cadre.top + cadre.height / 2,
      });
      setTimeout(() => (this.bulles = this.bulles.filter((b) => b.id !== id)), 800);
    },

    // --- Sauvegarde dans le navigateur ---
    sauvegarder() {
      if (this.efface) return;
      const partie = {
        lignes: this.lignes,
        total: this.total,
        clics: this.clics,
        bugsCorriges: this.bugsCorriges,
        succesObtenus: this.succesObtenus,
        achats: this.ameliorations.map((a) => ({ id: a.id, nombre: a.nombre, prix: a.prix })),
      };
      try {
        localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(partie));
      } catch {
        // Navigation privée ou stockage bloqué : le jeu marche quand même, sans sauvegarde.
      }
    },

    charger() {
      try {
        const partie = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE));
        if (!partie) return;
        this.lignes = Number(partie.lignes) || 0;
        this.total = Number(partie.total) || 0;
        this.clics = Number(partie.clics) || 0;
        this.bugsCorriges = Number(partie.bugsCorriges) || 0;
        this.succesObtenus = Array.isArray(partie.succesObtenus) ? partie.succesObtenus : [];
        for (const achat of partie.achats || []) {
          const a = this.ameliorations.find((x) => x.id === achat.id);
          if (a) {
            a.nombre = Number(achat.nombre) || 0;
            a.prix = Number(achat.prix) || a.prix;
          }
        }
      } catch {
        // Sauvegarde illisible : on repart de zéro.
      }
    },

    recommencer() {
      if (!confirm("Effacer toute ta progression ?")) return;
      this.efface = true;
      try {
        localStorage.removeItem(CLE_SAUVEGARDE);
      } catch {}
      location.reload();
    },
  };
}
