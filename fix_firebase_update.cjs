const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `      // Also sync to home_posts if the title or company/postedBy changes
      if (data.title || data.postedBy || data.company) {
        const homePostDoc = doc(db, "home_posts", id);
        const snap = await getDoc(homePostDoc);
        if (snap.exists()) {
          const updateData: any = {};
          if (data.title) updateData.title = data.title;
          if (data.postedBy) updateData.postedBy = data.postedBy;
          await updateDoc(homePostDoc, updateData);
        }
      }`;

const replaceWith = `      // Also sync to home_posts
      if (data.title || data.postedBy || data.company || data.salary || data.experience || data.location) {
        const homePostDoc = doc(db, "home_posts", id);
        const snap = await getDoc(homePostDoc);
        if (snap.exists()) {
          const updateData: any = {};
          if (data.title !== undefined) updateData.title = data.title;
          if (data.postedBy !== undefined) updateData.postedBy = data.postedBy;
          if (data.salary !== undefined) updateData.salary = data.salary;
          if (data.experience !== undefined) updateData.experience = data.experience;
          if (data.location !== undefined) updateData.location = data.location;
          await updateDoc(homePostDoc, updateData);
        }
      }`;

if (content.includes('// Also sync to home_posts if the title or company/postedBy changes')) {
    content = content.replace(target, replaceWith);
    fs.writeFileSync('src/lib/firebase.ts', content, 'utf8');
    console.log('Firebase sync updated');
} else {
    console.log('Target block not found');
}
