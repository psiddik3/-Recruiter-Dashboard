sed -i '/const unsubscribe = configDb.subscribe((config) => {/i \
    configDb.load().then(existing => {\n      if (!existing && teamRecruiters && companyName) {\n        configDb.save({ teamRecruiters, companyName, companyLogo });\n      }\n    });\n' src/App.tsx
