# CardioLog – Blutdruck, Puls und Gewicht

Version **1.0.4**, Stand 21.10.2026.

## Einrichtung als iPhone-Webapp

1. Alle Dateien **direkt in das Stammverzeichnis** eines GitHub-Repositories hochladen (keinen übergeordneten Ordner zusätzlich einfügen).
2. In GitHub unter **Settings → Pages** die Veröffentlichung aus dem Branch `main` und dem Verzeichnis `/ (root)` einschalten.
3. Die danach angezeigte HTTPS-Adresse in **Safari auf dem iPhone** aufrufen.
4. In Safari über **Teilen → Zum Home-Bildschirm** installieren.

Das ZIP-Archiv ist das Veröffentlichungs-Paket. Zum dauerhaften Speichern ist die Nutzung über eine HTTPS-Website erforderlich; das bloße Öffnen der HTML-Datei aus der iPhone-Dateien-App ist keine gleichwertige Installation.

## Daten und Funktionen

- Blutdruck, Puls und Gewicht mit Datum und Uhrzeit; Messbezug zu Frühstück, Mittagessen oder Abendessen; Nachbearbeitung/Löschen.
- Tageszeiten: Grün = morgens, Blau = mittags, Violett = abends.
- Drei Diagramme mit verbundenen Messpunkten und Zeiträumen Tag/Woche/Monat/Jahr/10 Jahre.
- Monatliche und jährliche Statistik.
- Bearbeitbare persönliche Daten (Name, Geburtsdatum/Alter, Größe, Gewicht) und individuell anpassbare Warnschwellen.
- Zwei **unbestätigte** Medikamenteneinträge aus dem Foto (BisoLich 1,25 mg und HCT 12,5 mg) als Startvorlage; alle Angaben müssen ärztlich oder mit der Apotheke abgeglichen werden.
- Berichtsauswahl und Drucken. **PDF speichern** verwendet den Safari-Druckdialog: über die Druckvorschau das PDF teilen und in **Dateien** sichern.
- JSON-Datensicherung / Import und CSV-Export.
- Update prüfen und installieren, wenn eine neuere Version im selben Webverzeichnis veröffentlicht wurde (über den Service Worker).

## Medizinischer Hinweis

Die App berechnet das Alter und den BMI, **aber keine individuellen medizinischen Grenzwerte aus Alter, Größe und Gewicht**, weil das ohne ärztliche Informationen nicht zuverlässig möglich ist. Die initialen Warnschwellen sind allgemeine Orientierungen; sie können keine individuelle Diagnose oder Therapieentscheidung ersetzen. Bei neuen Brustschmerzen, schwerer Atemnot, Lähmungen, Sprachstörungen oder Bewusstlosigkeit sofort **112**.

## Datenschutz

Messwerte liegen im **lokalen Browser-Speicher (localStorage)** auf dem jeweiligen Gerät. Die App enthält keinen eigenen Server für Messdaten und verschickt die Eingaben nicht. Die Daten werden **nicht verschlüsselt**; andere Personen mit Zugang zum entsperrten Gerät oder Browserprofil könnten sie einsehen. Beim Löschen von Browserdaten oder beim Wechsel von Browser/Website können gespeicherte Einträge verloren gehen. Regelmäßig eine JSON-Sicherung erstellen und sicher aufbewahren. Vor Veröffentlichung einer Website den vertrauenswürdigen Hosting-Anbieter und verwendete Skripte prüfen.

## Update-Hinweise für Betreiber

Bei jeder aktualisierten Veröffentlichung die Version in `app.js`, `version.json`, `sw.js`, `index.html` sowie die Cache-Version des Service Workers konsistent anheben. Im selben HTTPS-Pfad veröffentlichen, damit die bestehende installierte App das Update finden kann. Alte **PulsPilot**-Browserdaten werden einmalig eingelesen, wenn noch keine CardioLog-Daten vorhanden sind und derselbe Browser-Ursprung benutzt wird.

## Geprüfte Funktionen in Version 1.0.4

Messwerterfassung, Editieren/Löschen, Grenzwertwarnungen, Zeitraumauswahl, Medikamentenformular, Berichte, JSON-Export und iPhone-kompakte Browseransicht wurden automatisiert in Chromium geprüft. Die tatsächliche Installation und der Safari-Druckdialog müssen auf einem iPhone gesondert getestet werden.

## Neu in 1.0.4

- Feste iPhone-Darstellung: Deaktivierung des Pinch-/Doppeltipp-Zooms und Verhinderung des automatischen Safari-Fokuszooms durch ausreichend große Eingabeschrift. Hinweis: Das Einschränken der Bildschirmlupe/Zoomfunktion kann die Bedienbarkeit für Menschen mit Sehbeeinträchtigung vermindern.
- Nebenwirkungen zu Bisoprolol, Hydrochlorothiazid, Ramipril und Citalopram werden für erkannte Wirkstoffe automatisch angezeigt. Auswahl, keine vollständigen Beipackzettel.
- Bei Hinzufügen, Bearbeiten und Löschen eines Medikaments werden bekannte Kombinationen aus diesen vier Wirkstoffen neu bewertet. Aktuell vier quellenbasierte Paarhinweise.
- Unbekannte Namen/Wirkstoffe ausdrücklich „nicht geprüft“; keine Entwarnung aus fehlenden Treffern. Persönliche Hinweise zu Neben- und Wechselwirkungen bearbeitbar, separat als ungeprüft gekennzeichnet.
- PDF/Druckbericht enthält Nebenwirkungen, bekannte Interaktionen und Quellenlinks (bei Onlineverbindung).
- Die Offline-Datenbank kann nur durch neue App-Versionen erweitert werden: eine vollständige laufende Aktualisierung oder personalisierte medizinische Interaktionsprüfung ist nicht vorhanden.

Verwendete Quellen: Zentiva BisoLich https://www.zentiva.de/produkte/produktkatalog/bisolich; HCT 1A Pharma https://www.apotheken-umschau.de/medikamente/beipackzettel/hct-1a-pharma-125-mg-tabletten-6453151.html; Ramipril https://www.patienteninfo-service.de/a-z-liste/r/ramipril-1a-pharma-5mg-tabletten; Citalopram-Fachinfo https://www.patienteninfo-service.de/a-z-liste/c/citalopram-hexal-20mg-filmtabletten; Kombinationen https://www.fachinfo.de/fi/pdf/004419 und https://www.patienteninfo-service.de/a-z-liste/r/ramipril-hexal-comp-5mg125mg-tabletten.

## Version 1.0.4 – Fehlerkorrekturen

- Speichern/Bearbeiten/Löschen wird bei LocalStorage-Fehlern im Arbeitsspeicher zurückgerollt; keine falsche Erfolgsmeldung.
- Import prüft ungültige und doppelte Einträge vor dem Ersetzen; Daten werden nicht stillschweigend weggelassen.
- CSV-Freitexte werden gegen die Ausführung von Tabellenformeln geschützt.
- Zeitfarben in Gewichtsdiagrammen richten sich nach Uhrzeit; aggregierte Messpunkte bekommen keine falschen Tageszeitfarben.
- Die Updatefunktion meldet eine Aktivierung nur, wenn ein Service Worker dafür bereitsteht. Die Versionsnummer nach Neustart kontrollieren.
- Durch die Änderung werden bestehende CardioLog-Daten nicht automatisch gelöscht. Daten bleiben lokal **unverschlüsselt**; weiterhin regelmäßige JSON-Sicherungen erstellen.

### Grenzen der Prüfung

Automatisierte Tests in Chromium und mobilem Viewport ersetzen keine Prüfung in Safari auf einem realen iPhone. Die Offline-Medikamenteninformationen umfassen keine vollständige Interaktionsdatenbank und sind kein Ersatz für Apotheke oder ärztlichen Rat.

- Zusätzlicher Warnhinweis bei extrem auffälligem Ruhepuls unter 40 oder über 150/min (nur Orientierung; keine individuelle Diagnose).
- Defekte lokale Datensätze verhindern schreibende Änderungen, bis die Daten fachkundig wiederhergestellt werden.
- Importierte Grenzwerte und Profilfelder werden vor dem Ersetzen geprüft.
