
const express = require("express");//Import du module Express
const dotenv = require("dotenv");//Import du module (variables env)
const fs = require("fs");//Import (file system)
const path = require("path");//import path
const cors = require("cors");
const db = require("./config/db.js"); //base de donnée
const { check, validationResult } = require("express-validator");// Importation des outils de validation de express-validator

//charge les variables d'environnement
dotenv.config();

//cree instance de express server
const server = express();


//Middlewares express.static sert les fichers statiques
//!!Doit être avant les routes/points d'accès!!
server.use(cors());
server.use(express.static(path.join(__dirname, "public")));

//Middleware pour analyser les corps de requete JSON
server.use(express.json());


//les codes de statut HTTP
//200 OK
//201 Created
//400 donnees non conformes
//404 Not Found
//500 internal server error


// Définition des routes et de leur logique
// Route GET pour récupérer tous les films, avec tri selon les paramètres de l'URL (Ex: /api/films?tri=annee&ordre=asc).
server.get("/api/films", async (req, res) => {
  try {
    console.log(req.query);
    // Extraction et définition des paramètres de tri depuis l'URL
    const direction = req.query["ordre"] || "asc";
    const tri = req.query["tri"] || "annee";
    // Requête à la base de données pour récupérer et trier les films
    const filmsRef = await db.collection("film").orderBy(tri, direction).get();
    const films = [];

    filmsRef.forEach((doc) => {
      const filmsAjouter = doc.data();
      filmsAjouter.id = doc.id;

      films.push(filmsAjouter);// Ajoute chaque film récupéré à la liste des films

    });

    res.statusCode = 200;// Réponse avec statut HTTP 200 OK
    res.json(films);// Envoie les films récupérés en format JSON

  } catch (erreur) {
    res.statusCode = 500;// Réponse avec statut HTTP 500 en cas d'erreur serveur
    res.json({ message: "Une erreur au niveau du serveur. " });
  }
});

// Route GET pour récupérer un film spécifique par son ID
server.get("/api/films/:id", async (req, res) => {
  //req.params.id récupère la valeur de l'ID du film passée dans l'URL.
  const filmRef = await db.collection("film").doc(req.params.id).get();
  //.exists est une propriété booléenne de l'objet Doc
  if (!filmRef.exists) {
    res.status(404).json({ message: "film non trouvé" });
  } else {
    res.status(200).json(filmRef.data());
  }


});


// Route POST pour ajouter un nouveau film avec validation des données entrantes
server.post("/api/films",
  [
    check('titre').trim().escape().notEmpty().withMessage('Le titre du film est requis.'),
    check('description').trim().escape().isLength({ min: 20 }).withMessage('La description doit comporter entre 20 et 150 caractères.'),
    check('annee').trim().escape().notEmpty().isNumeric().withMessage('L\'année doit être numérique.'),
    check('realisation').trim().escape().notEmpty().withMessage('Le nom du réalisateur est requis.'),
    check('titreVignette').trim().escape().notEmpty().withMessage('Le titre de la vignette est requis.')
  ],
  async (req, res) => {
    const validation = validationResult(req);
    if (validation.errors.length > 0) {
      res.statusCode = 400;  // Si validation échoue, retourne 400 Bad Request
      return res.json({ message: "Données non-conformes" });
    }

    try {
      const { titre, description, annee, realisation, titreVignette } = req.body;
      // Ajout du nouveau film dans la base de données
      docRef = await db.collection("film").add({ titre, description, annee, realisation, titreVignette });

      res.status(201).json({ message: "Film ajouté avec succès", filmId: docRef.id });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'ajout du film" });
    }
  });

// Route PUT pour mettre à jour un film existant identifié par son ID .

server.put("/api/films/:id",
  [
    check('titre').trim().escape().notEmpty().withMessage('Le titre du film est requis.'),
    check('description').trim().escape().isLength({ min: 20 }).withMessage('La description doit comporter entre 20 et 150 caractères.'),
    check('annee').trim().escape().notEmpty().isNumeric().withMessage('L\'année doit être numérique.'),
    check('realisation').trim().escape().notEmpty().withMessage('Le nom du réalisateur est requis.'),
    check('titreVignette').trim().escape().notEmpty().withMessage('Le titre de la vignette est requis.')
  ],

  async (req, res) => {
    // Exécute la validation des champs et vérifie s'il y a des erreurs.
    const validation = validationResult(req);
    // Si des erreurs de validation sont trouvées, 
    if (validation.errors.length > 0) {
      //renvoie une réponse 400 (Bad Request).
      res.statusCode = 400;
      return res.json({ message: "Données non-conformes" });
    }
    try {
      // Récupère l'ID du film à partir de l'URL
      const id = req.params.id;
      // Récupère le film à modifier depuis le corps de la requête
      const filmModifie = req.body;
      // Mets à jour le film dans la collection 'film' avec les nouvelles données
      await db.collection("film").doc(id).update(filmModifie);

      // Réponse en cas de succès
      res.status(200).json({ message: "Le film a été modifié avec succès." });
    } catch (erreur) {
      res.status(500).json({ message: "Une erreur est survenue lors de la modification du film: " + erreur.message });
    }
  });


// Route DELETE pour supprimer un film spécifique par son ID.
server.delete("/api/films/:id", async (req, res) => {
  //Récupere l"ID du film a partir de l'URL
  const id = req.params.id;
  try {
    //supprimer le document correspondant à l'ID du film
    await db.collection("film").doc(id).delete();

    res.status(200).json({ message: "Le film a été supprimer avec succès. " });

  } catch (error) {
    console.log("Erreur lors de la suppresion du film :", error.message);
    res.status(500).json({ message: "Erreur " })
  }

})

// Route POST pour l'inscription d'un nouvel utilisateur
server.post(
  "/api/utilisateurs/inscription",
  [
    // express-validator pour valider le courriel et le mot de passe.
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({ min: 8, max: 20 }).isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 1,
    }),
  ],
  async (req, res) => {
    // Exécute les validations et vérifie les erreurs.
    const validation = validationResult(req);
    if (validation.errors.length > 0) {
      // Si des erreurs de validation sont trouvées, renvoie une réponse d'erreur.
      res.statusCode = 400;
      return res.json({ message: "Données non-conformes" });
    }

    // Extrait les données {courriel et mdp} du corps de la requête.

    const { courriel, mdp } = req.body;
    console.log(courriel);
    // On vérifie si le courriel existe 
    const docRef = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
    const utilisateurs = [];

    docRef.forEach((doc) => {
      // Pour chaque document trouvé, ajoute les données de l'utilisateur dans le tableau 'utilisateurs'.
      utilisateurs.push(doc.data());
    });

    console.log(utilisateurs);
    res.status(200)
    // Si un utilisateur avec le même courriel est trouvé, renvoie un message d'erreur.
    if (utilisateurs.length > 0) {
      res.statusCode = 400;
      return res.json({ message: "Le courriel existe déjà" });
    }


    // Crée un nouvel objet utilisateur avec le courriel et le mot de passe.
    const nouvelUtilisateur = { courriel, mdp };
    // Ajoute le nouvel utilisateur dans la base de données.
    await db.collection("utilisateurs").add(nouvelUtilisateur);

    // Supprime le mot de passe avant de l'envoyer dans la réponse (sécurité)
    delete nouvelUtilisateur.mdp;

    // On renvoie true;
    res.status(200).json({ message: "Inscription réussie", utilisateur: nouvelUtilisateur });

  }
);

// Route POST pour la connexion des utilisateurs.
server.post("/api/utilisateurs/connexion", async (req, res) => {
  // On récupère les infos du body
  const { mdp, courriel } = req.body;

  // On vérifie si le courriel existe
  const docRef = await db.collection("utilisateurs").where("courriel", "==", courriel).get();

  const utilisateurs = [];
  docRef.forEach((utilisateur) => {
    utilisateurs.push(utilisateur.data());
  });
  // Vérifie si aucun utilisateur n'a été trouvé avec le courriel fourni
  if (utilisateurs.length == 0) {
    res.statusCode = 400;
    return res.json({ message: "Courriel invalide" });
  }
  // Cette ligne prend le premier utilisateur trouvé dans la base de données
  const utilisateurAValider = utilisateurs[0];

  // Compare le mot de passe fourni avec celui stocké pour cet utilisateur.
  if (utilisateurAValider.mdp !== mdp) {
    res.statusCode = 400;
    return res.json({ message: "Mot de passe invalide" });
  }

  // On retourne les infos de l'utilisateur sans le mot de passe
  delete utilisateurAValider.mdp;
  res.status(200).json({ message: "Connexion réussie", utilisateur: utilisateurAValider });
});

// DOIT Être la dernière!!
// middleware qui capture toutes les requêtes non traitées par les routes précédentes.

server.use((req, res) => {
  res.statusCode = 404;
  res.render("404", { url: req.url });
});

// DOIT Être a la fin !!
//Ce code démarre le serveur Express sur le port spécifié
server.listen(process.env.PORT, () => {
  console.log("Le serveur a démarré");
});











