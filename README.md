# Open Job Analysis

A free, open source tool that walks a small or medium-sized business through a structured job analysis: what a job really involves, what a person needs in order to do it, and the evidence that ties the two together.

It runs entirely in your web browser. There is nothing to install, no account, and no server. Your data stays on your computer.

## Utiliser l'outil en français

L'outil existe en français et en anglais. Choisissez la langue avec les boutons **FR / EN** en haut à droite, ou ajoutez `?lang=fr` à l'adresse (par exemple `https://jfeg1.github.io/work-analyzer.app/?lang=fr`). L'outil retient votre choix.

- **Partir d'une fiche ROME** : à l'étape 1, cherchez un intitulé de poste ou un code (par exemple « assistant RH » ou « M1501 ») parmi les 14 330 appellations des 1 923 fiches du ROME de France Travail. La fiche affiche sa définition, l'accès au métier et les contextes de travail. Vous choisissez ensuite les éléments à importer : les savoir-faire « cœur de métier » sont cochés et deviennent des tâches (ou des compétences, au choix) ; les savoirs, les certifications et les savoir-être restent décochés. Chaque élément importé garde son code ROME et reste signalé « À préciser » tant que vous ne l'avez pas réécrit : une fiche décrit un métier en général, pas votre poste. L'accès au métier n'est jamais importé comme une exigence.
- **Exemple** : en français, **Charger l'exemple** ouvre une analyse complète du poste d'assistant ou assistante RH, construite à partir de la fiche ROME M1501 de France Travail (version 62, octobre 2026, Licence Ouverte).
- **Langue du projet** : chaque projet garde la langue dans laquelle il a été créé. Un fichier envoyé à un référent métier s'ouvre dans cette langue.
- **Échelles** : les échelles de notation sont traduites à partir de l'OPM. « Distinguishing value » devient « Capacité à départager ».
- **Période d'essai** : l'échelle « Besoin à l'embauche » est accompagnée d'un repère sur la période d'essai (art. L. 1221-19 à L. 1221-22 du Code du travail).
- **Exports** : en français, le CSV utilise le point-virgule et la virgule décimale, pour s'ouvrir correctement dans Excel.
- **Fiches de travail** : quatre fiches en français, à imprimer, sont dans [`worksheets/fr/`](worksheets/fr), au format Word (`.docx`) et OpenDocument (`.odt`, pour LibreOffice) : tâches, compétences, liens entre tâches et compétences, et échelles de notation (référence). Chaque référent métier les remplit seul ; vous saisissez ensuite les notes dans l'outil. Les trois autres fiches anglaises (réalisations, grilles de notation) relèvent de la procédure fédérale américaine et ne sont pas traduites.

- **Cotation des emplois et JobEval** : à l’étape 1, cochez « Recueillir aussi un profil pour la cotation des emplois ». Les référents métier indiquent alors le niveau exigé par le poste sur les 14 sous-critères de la boîte à outils européenne (EIGE) pour une évaluation des emplois neutre du point de vue du genre, prévue par la directive (UE) 2023/970 sur la transparence des rémunérations. L’étape 6 affiche la médiane et l’écart des niveaux ; le bouton **Envoyer vers JobEval** de l’étape 8 transmet le poste à [JobEval](https://jfeg1.github.io/JobEval/) (interface en anglais). La traduction française des niveaux n’est pas officielle.

**Source ROME.** Les données viennent de France Travail, *Répertoire opérationnel des métiers et des emplois* (ROME 4.0, version 62, octobre 2026), réutilisées sous la Licence Ouverte (Etalab). Le rapport et le CSV portent cette mention dès qu'un projet utilise le ROME.

**Données personnelles (RGPD).** L'outil n'envoie rien : les noms des référents et leurs notes restent sur votre ordinateur et dans les fichiers que vous enregistrez. L'employeur qui conserve ces fichiers en est responsable (durée de conservation, accès).

## Why job analysis

A job analysis is the foundation for a job description, a job advert, a selection process and a defensible pay decision. Without one, requirements such as "significant experience" or "degree from a good school" are guesses. With one, every requirement can be traced back to real work.

## How to use it

**Online:** open the hosted page (see "Publishing" below for how the maintainer sets this up).

**Offline:** click **Code → Download ZIP** on GitHub, unzip, and double-click `index.html`.

Then follow the eight steps along the top:

1. **Job** – record the job and the information you collected about it.
2. **Tasks** – list the tasks and where each came from.
3. **Competencies** – list the knowledge, skills, abilities and other characteristics, with definitions.
4. **Raters** – add your job experts: people who know the job well.
5. **Ratings** – each rater scores tasks (importance, frequency) and competencies (importance, need at entry, distinguishing value).
6. **Critical items** – the app averages the ratings and shows which tasks and competencies are critical.
7. **Linkage** – raters score how important each critical competency is to each critical task.
8. **Report** – the final lists, your decisions on how each competency will be used in selection, and a printable record.

Click **Load example** to see a completed analysis.

### Collecting ratings from several people

Raters should score independently. Two options:

- **Send files.** At the Raters step, save a file for each rater and email it. The rater opens the app, chooses **Open file**, rates, and sends back the file they save. Open that file in your project and the ratings are added. A rater file never contains another rater's scores. Round 1 covers tasks and competencies; round 2 covers linkage, once round 1 shows what is critical.
- **Enter them yourself.** Collect ratings on paper (printable worksheets are in [`worksheets/`](worksheets), in Word `.docx` and OpenDocument `.odt` format for LibreOffice and other free office suites) or in an interview and type them in.

### Job evaluation and pay (JobEval)

At step 1, tick **Also collect a job evaluation profile**. Job experts then also give the level the job requires on the 14 subfactors of the EU toolkit on gender-neutral job evaluation (EIGE): the plan behind the four criteria in the EU Pay Transparency Directive (skills, responsibility, effort and working conditions). Step 6 shows the median and range of their levels, and flags subfactors where experts disagree by two levels or more.

On the Report step, **Send to JobEval** passes the job to [JobEval](https://jfeg1.github.io/JobEval/), the companion tool that compares jobs, builds pay grades and produces the reports the Directive asks for. Online, the job opens straight in JobEval; offline, the project file is saved for you to import there. The levels are evidence for JobEval's evaluation committee, not the final levels.

### Saving your work

The app autosaves in your browser, but browser storage can be cleared. Use **Save file** to keep a `.json` project file, and **Open file** to pick it up again on any computer.

## The method

The procedure follows the job analysis methodology in the U.S. Office of Personnel Management's *Delegated Examining Operations Handbook*, Appendix D, which is in the public domain. The rules the app applies:

| Step | Rule (default cutoffs, adjustable at step 1) |
|---|---|
| Remove tasks | A task is removed if at least half of the raters scored it 0 (not performed) on either scale |
| Average | Ratings are averaged across raters; 0 ratings are left out of the average |
| Critical tasks | Average importance ≥ 3.0 **and** average frequency ≥ 3.0 |
| Rare but important tasks | A task below the frequency cutoff but averaging ≥ 4.0 on importance is flagged; the analyst decides whether to keep it as critical |
| Critical competencies | Average importance ≥ 3.0 **and** average need at entry ≤ 2.0 |
| Candidates for assessment | Critical competencies with average distinguishing value ≥ 3.0 |
| Linkage | A competency is linked to a task when the average linkage rating is ≥ 3.0 |
| Final lists | Tasks linked to no competency, and competencies linked to no task, are set aside |

The rare-but-important check is an addition to the handbook's method. A strict frequency cutoff drops tasks that are seldom performed but matter a great deal when they are, a weakness noted in the job analysis literature (Guion, 2011, *Assessment, Measurement, and Prediction for Personnel Decisions*, ch. 2). The app flags these tasks and leaves the decision to the analyst; the report records what was kept.

Two implementation choices go slightly beyond the handbook's wording: 0 ("not applicable") ratings are left out of competency and linkage averages as well as task averages, and an item counts for a rater only once that rater has scored it on every scale.

The handbook's federal-specific steps (selective and quality ranking factor forms, score transmutation, veterans' preference) are replaced by a simple record of whether each competency can be assessed and whether it is used as a minimum requirement or a ranking factor.

## Privacy

Everything happens in your browser. The app sends nothing anywhere and has no analytics. The only files it loads are its own ROME data files (`data/rome/`), from the same place as `index.html`, and only when you open the ROME panel. Project files and rater files are plain JSON that you choose where to save and whom to send to. Rater names and ratings are personal data: whoever keeps the project files is responsible for how long they are kept and who can see them.

## Development

The whole app is one file, `index.html`, with no dependencies and no build step. The calculation logic sits between the `CORE-START` and `CORE-END` markers, the worked examples between `EXAMPLE-START` and `EXAMPLE-END`, and all interface text (English and French) between `I18N-START` and `I18N-END`. Project files are at version 2 (they record the project's `lang`; tasks and competencies may carry an optional `origin` and `kind`); version 1 files open without loss.

### ROME data

The ROME (France Travail's reference of occupations) is loaded from `data/rome/`: `current.js` names the version in use, and `v<N>/` holds `version.js` (dates, licence, attribution), `index.js` (all job titles, for the search) and one small file per profile (`M1501.js` …). Each is a plain script (`OJA_ROME.add(...)`), so the app can load it with a `<script>` tag both from a web server and from a file opened on the disk. Projects record the ROME version of every imported item.

France Travail publishes a new ROME version about twice a year. To update:

```
node tools/build-rome.mjs
```

The script (Node 18+, no dependencies; it uses `curl` to download) fetches the open data (`RefRomeJson.zip` from `api.francetravail.fr`, and the "Arborescence principale" spreadsheet from data.gouv.fr, used to place the rarely used job titles under their profile), decodes it (the JSON files are Windows-1252, not UTF-8), writes `data/rome/v<N>/` and points `current.js` to it. It checks the counts (profiles against `version.txt`, every job title placed under a profile) and stops with an error rather than writing partial data. To build from files you downloaded yourself: `node tools/build-rome.mjs --zip RefRomeJson.zip --arbo arboprincipale.xlsx`. Keep the previous `v<N>` folder while older projects may still be opened, then run the tests, check the French example, and commit.

Run the tests with:

```
node tests/test.js
```

Issues and pull requests are welcome.

## Publishing (for maintainers)

1. Create a public repository on GitHub and upload the contents of this folder.
2. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
3. After a minute the app is live at `https://<your-username>.github.io/<repository-name>/`.

## Disclaimer

This tool supports good practice; it is not legal advice. Employment law differs by country. If you rely on a job analysis for hiring or pay decisions, check the requirements that apply to you.

## License

MIT. See [LICENSE](LICENSE). The worksheets in `worksheets/` are adapted from a public-domain U.S. Government work. The ROME data in `data/rome/` and the French example come from France Travail, ROME 4.0 (version 62, October 2026), reused under the Licence Ouverte / Open Licence (Etalab).
