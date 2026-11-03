// jeu.js — toute la logique de ton jeu.
// Alpine.js s'occupe du reste : dès qu'une donnée change, la page se met à jour toute seule.

const CLE_SAUVEGARDE = "dev-clicker-v2:" + location.pathname;
const MAX_CURSEURS = 12;
// Pour personnaliser ton jeu, regarde juste en dessous.

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
      { id: "hello", nom: "Hello world : 1er clic", obtenu: false, condition: (j) => j.clics >= 1 },
      { id: "script", nom: "Premier script : 100 lignes", obtenu: false, condition: (j) => j.total >= 100 },
      { id: "equipe", nom: "Chef d'équipe : 10 par seconde", obtenu: false, condition: (j) => j.parSeconde >= 10 },
      { id: "projet", nom: "Projet de BTS : 1 000 lignes", obtenu: false, condition: (j) => j.total >= 1000 },
      { id: "acharne", nom: "Clic infatigable : 500 clics", obtenu: false, condition: (j) => j.clics >= 500 },
      { id: "startup", nom: "Startup : 100 000 lignes", obtenu: false, condition: (j) => j.total >= 100000 },
      { id: "debug", nom: "Débogueur : 10 bugs corrigés", obtenu: false, condition: (j) => j.bugsCorriges >= 10 },
    ],

    // --- L'état de la partie ---
    lignes: 0,
    total: 0,
    clics: 0,
    notification: "",
    bulles: [],
    // 5 places pour les bugs : un bug « actif » est à l'écran.
    bugs: [
      { id: 1, actif: false, x: 0, y: 0 },
      { id: 2, actif: false, x: 0, y: 0 },
      { id: 3, actif: false, x: 0, y: 0 },
      { id: 4, actif: false, x: 0, y: 0 },
      { id: 5, actif: false, x: 0, y: 0 },
    ],
    bugsCorriges: 0,
    toucheEnfoncee: false,
    efface: false,

    get parClic() {
      let somme = 1;
      for (const amelioration of this.ameliorations) {
        somme = somme + amelioration.parClic * amelioration.nombre;
      }
      return somme;
    },

    get parSeconde() {
      let somme = 0;
      for (const amelioration of this.ameliorations) {
        somme = somme + amelioration.parSeconde * amelioration.nombre;
      }
      return somme / this.malus;
    },

    // Le nombre de succès obtenus, affiché à côté du titre « Succès ».
    get nombreSucces() {
      let nombre = 0;
      for (const s of this.succes) {
        if (s.obtenu) nombre++;
      }
      return nombre;
    },

    // Le nombre de bugs à l'écran.
    get bugsActifs() {
      let nombre = 0;
      for (const bug of this.bugs) {
        if (bug.actif) nombre++;
      }
      return nombre;
    },

    // Chaque bug actif divise la production par 2 : 1 bug → ÷ 2, 2 bugs → ÷ 4, 3 bugs → ÷ 8…
    get malus() {
      return Math.pow(2, this.bugsActifs);
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
      this.lignes = this.lignes + quantite;
      this.total = this.total + quantite;
      this.verifierSucces();
    },

    cliquer(evenement) {
      this.clics++;
      this.gagner(this.parClic);
      this.ajouterBulle(evenement, "+" + this.formater(this.parClic));
    },

    // Chaque touche du clavier compte comme un clic, comme si on tapait vraiment du code.
    taper(evenement) {
      if (evenement.repeat) return; // garder une touche enfoncée ne compte qu'une fois
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return; // Ctrl + S, Ctrl + R… restent normaux
      if (evenement.key.length !== 1 && evenement.key !== "Enter") return; // pas de Tab, F5, F12, flèches…
      // Sur un bouton, Entrée et Espace le cliquent déjà : on ne compte pas deux fois.
      if (document.activeElement.tagName === "BUTTON" && (evenement.key === "Enter" || evenement.key === " ")) return;
      evenement.preventDefault(); // Espace ne fait plus défiler la page
      this.cliquer({ currentTarget: this.$refs.touche });
      this.toucheEnfoncee = true;
      clearTimeout(this.minuteurTouche);
      this.minuteurTouche = setTimeout(() => (this.toucheEnfoncee = false), 90);
    },

    acheter(amelioration) {
      if (this.lignes < amelioration.prix) return;
      this.lignes = this.lignes - amelioration.prix;
      amelioration.nombre++;
      amelioration.prix = Math.ceil(amelioration.prix * 1.15);
    },

    description(amelioration) {
      let texte = "";
      if (amelioration.parClic) texte = texte + "+" + amelioration.parClic + " par clic ";
      if (amelioration.parSeconde) texte = texte + "+" + amelioration.parSeconde + " par seconde";
      return texte;
    },

    formater(nombre) {
      return Math.floor(nombre).toLocaleString("fr-FR");
    },

    verifierSucces() {
      for (const s of this.succes) {
        if (!s.obtenu && s.condition(this)) {
          s.obtenu = true;
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
      // Pas de bug au tout début de la partie.
      if (this.total < 50) return;
      // On cherche une place libre : le premier bug qui n'est pas actif.
      for (const bug of this.bugs) {
        if (!bug.actif) {
          bug.actif = true;
          bug.x = 8 + Math.random() * 84; // position en % de la largeur de la fenêtre
          bug.y = 12 + Math.random() * 76; // position en % de la hauteur
          this.notifier("🐛 Un bug ! Clique dessus pour le corriger.");
          return; // un seul bug à la fois
        }
      }
    },

    // Toutes les 100 ms, chaque bug efface 0,2 % des lignes : les malus se cumulent.
    subirBugs() {
      if (this.bugsActifs === 0) return;
      this.lignes = this.lignes * Math.pow(0.998, this.bugsActifs);
    },

    corrigerBug(bug) {
      bug.actif = false;
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
      this.bulles.push({
        id: Date.now() + Math.random(),
        texte: texte,
        x: evenement.clientX || cadre.left + cadre.width / 2,
        y: evenement.clientY || cadre.top + cadre.height / 2,
      });
      // 800 ms plus tard, l'animation est finie : on retire la plus ancienne bulle.
      setTimeout(() => this.bulles.shift(), 800);
    },

    // --- Sauvegarde dans le navigateur ---
    sauvegarder() {
      if (this.efface) return;
      const partie = {
        lignes: this.lignes,
        total: this.total,
        clics: this.clics,
        bugsCorriges: this.bugsCorriges,
        achats: {},
        succes: {},
      };
      // Chaque amélioration a son casier dans achats, étiqueté par son id.
      for (const amelioration of this.ameliorations) {
        partie.achats[amelioration.id] = { nombre: amelioration.nombre, prix: amelioration.prix };
      }
      // Pareil pour les succès : true s'il est obtenu, false sinon.
      for (const s of this.succes) {
        partie.succes[s.id] = s.obtenu;
      }
      localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(partie));
    },

    charger() {
      const partie = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE));
      if (!partie) return;
      this.lignes = partie.lignes;
      this.total = partie.total;
      this.clics = partie.clics;
      this.bugsCorriges = partie.bugsCorriges;
      for (const amelioration of this.ameliorations) {
        const achat = partie.achats[amelioration.id];
        if (achat) {
          amelioration.nombre = achat.nombre;
          amelioration.prix = achat.prix;
        }
      }
      for (const s of this.succes) {
        if (partie.succes[s.id]) s.obtenu = true;
      }
    },

    recommencer() {
      if (!confirm("Effacer toute ta progression ?")) return;
      this.efface = true;
      localStorage.removeItem(CLE_SAUVEGARDE);
      location.reload();
    },
  };
}
