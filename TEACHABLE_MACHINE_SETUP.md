# Teachable Machine Integration Setup

## 📚 How to Set Up Your Teachable Machine Model

### Step 1: Train Your Model
1. Go to [Teachable Machine](https://teachablemachine.withgoogle.com/)
2. Create a new **Image Project**
3. Add classes like:
   - `book` - for book pages
   - `no_book` - for empty views or non-book objects
4. Train with at least 50-100 images per class
5. Export your model

### Step 2: Download Model Files
1. Click **Download my model** in Teachable Machine
2. Extract the ZIP file
3. You should have:
   - `model.json`
   - `metadata.json`
   - `weights.bin` (if applicable)

### Step 3: Add Model to Your Project
1. Create a folder called `my_model` in your project directory
2. Copy the downloaded files into `my_model/`:
   ```
   VT Hacks 13/
   ├── my_model/
   │   ├── model.json
   │   └── metadata.json
   ├── index.html
   ├── script.js
   └── ...
   ```

### Step 4: Update Model URL (if needed)
If you want to host your model elsewhere, update the URLs in `script.js`:

```javascript
// In loadTeachableModel() method
const modelURL = "https://your-domain.com/my_model/model.json";
const metadataURL = "https://your-domain.com/my_model/metadata.json";
```

### Step 5: Test Your Integration
1. Start your server: `npm run server`
2. Open: `http://localhost:3001`
3. Allow camera access
4. Hold up a book and watch the confidence indicator!

## 🎯 Expected Behavior

- **High confidence (70%+)**: Green indicator, "book detected!"
- **Medium confidence (40-69%)**: Yellow indicator, "Possible book"
- **Low confidence (<40%)**: Red indicator, "No book detected"
- **Button enables** automatically when book is detected

## 🔧 Troubleshooting

### Model Not Loading
- Check that `my_model/` folder exists
- Verify `model.json` and `metadata.json` are in the folder
- Check browser console for errors
- Falls back to computer vision if model fails

### Low Accuracy
- Retrain with more diverse images
- Include different lighting conditions
- Add various book types and angles
- Ensure good contrast in training images

## 📝 Notes

- The system automatically falls back to computer vision if Teachable Machine model fails
- Confidence updates every second
- Model runs in the browser (no server required)
- Works offline once model is loaded

