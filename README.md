# Open Job Analysis

A free, open source tool that walks a small or medium-sized business through a structured job analysis: what a job really involves, what a person needs in order to do it, and the evidence that ties the two together.

It runs entirely in your web browser. There is nothing to install, no account, and no server. Your data stays on your computer.

## Utiliser l'outil en français

L'outil existe en français et en anglais. Choisissez la langue avec les boutons **FR / EN** en haut à droite, ou ajoutez `?lang=fr` à l'adresse (par exemple `https://jfeg1.github.io/work-analyzer.app/?lang=fr`). L'outil retient votre choix.

- **Exemple** : en français, **Charger l'exemple** ouvre une analyse complète du poste d'assistant ou assistante RH, construite à partir de la fiche ROME M1501 de France Travail (version 62, octobre 2026, Licence Ouverte).
- **Langue du projet** : chaque projet garde la langue dans laquelle il a été créé. Un fichier envoyé à un référent métier s'ouvre dans cette langue.
- **Échelles** : les échelles de notation sont traduites à partir de l'OPM. « Distinguishing value » devient « Capacité à départager ».
- **Période d'essai** : l'échelle « Besoin à l'embauche » est accompagnée d'un repère sur la période d'essai (art. L. 1221-19 à L. 1221-22 du Code du travail).
- **Exports** : en français, le CSV utilise le point-virgule et la virgule décimale, pour s'ouvrir correctement dans Excel.
- **Fiches de travail Word** : quatre fiches en français, à imprimer, sont dans [`worksheets/fr/`](worksheets/fr) : tâches, compétences, liens entre tâches et compétences, et échelles de notation (référence). Chaque référent métier les remplit seul ; vous saisissez ensuite les notes dans l'outil. Les trois autres fiches anglaises (réalisations, grilles de notation) relèvent de la procédure fédérale américaine et ne sont pas traduites.

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
- **Enter them yourself.** Collect ratings on paper (printable Word worksheets are in [`worksheets/`](worksheets)) or in an interview and type them in.

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

Everything happens in your browser. The app makes no network requests and has no analytics. Project files and rater files are plain JSON that you choose where to save and whom to send to. Rater names and ratings are personal data: whoever keeps the project files is responsible for how long they are kept and who can see them.

## Development

The whole app is one file, `index.html`, with no dependencies and no build step. The calculation logic sits between the `CORE-START` and `CORE-END` markers, the worked examples between `EXAMPLE-START` and `EXAMPLE-END`, and all interface text (English and French) between `I18N-START` and `I18N-END`. Project files are at version 2 (they record the project's `lang`; tasks and competencies may carry an optional `origin` and `kind`); version 1 files open without loss.

To do: French versions of the Word worksheets; importing items from the ROME (France Travail). Run the tests with:

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

MIT. See [LICENSE](LICENSE). The worksheets in `worksheets/` are adapted from a public-domain U.S. Government work. The French example uses ROME 4.0 data from France Travail (version 62, October 2026), reused under the Licence Ouverte.
