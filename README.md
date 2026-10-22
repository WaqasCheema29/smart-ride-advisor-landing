# Smart Ride Advisor landing page

Standalone single-page website for Smart Ride Advisor, an Android fare-guidance app for drivers in Pakistan.

This repository contains the self-contained reconstruction shared in the project conversation, based on the saved landing-page content. It is not a byte-for-byte export of the existing ChatGPT Site. Its CSS, illustrative app interface and browser calculator are included in `index.html`.

## Files

- `index.html` — complete page, responsive CSS and browser JavaScript.
- `.gitignore` — common local editor and operating-system files.

## Preview locally

Download or clone this repository and open `index.html` in a browser. No package installation or build step is required.

To serve it over HTTP with Python installed, run from the project folder:

```sh
python -m http.server 8000
```

Then open http://localhost:8000.

## Share with developers

Open the repository's **Code** menu and choose **Download ZIP**, or clone it:

```sh
git clone https://github.com/WaqasCheema29/smart-ride-advisor-landing.git
```

## Included sections

- App introduction and illustrative interface in a purple/gold theme
- App identity and developer information
- How it works
- Local example fare calculator including pickup and passenger distance
- Android permissions explanations
- FAQ and support
- Pre-release privacy policy draft
- Account-deletion email instructions

Support: [smartrideadvisor.support@gmail.com](mailto:smartrideadvisor.support@gmail.com).

## Calculator scope

The website computes gross fare per total kilometre, estimated fuel, commission and contribution before maintenance and other costs. Entries stay in the browser. The displayed rate bands are illustrative; the example does not reproduce the Android app's full safeguards or determine inDrive's allowed offers. Default values are examples.

## Release notes

The privacy policy retains the saved page's **pre-release draft** notice. Confirm the released Android app's data practices, retention and deletion handling before using the policy for a store submission. Add the actual Google Play link after release.

Uploading this repository does not update the existing hosted ChatGPT Site or enable GitHub Pages.

## Verification

Source checks and a lightweight calculator/DOM smoke check were performed before upload. The Windows execution environment was unavailable, so this upload was not verified in a browser.
