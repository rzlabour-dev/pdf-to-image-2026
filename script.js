// DOM Elements
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loading = document.getElementById('loading');
const loadingStatus = document.getElementById('loadingStatus');
const previewSection = document.getElementById('previewSection');
const previewContainer = document.getElementById('previewContainer');
const stats = document.getElementById('stats');
const resetAppLink = document.getElementById('resetApp');

// Stats elements
const pageCountEl = document.getElementById('pageCount');
const fileSizeEl = document.getElementById('fileSize');
const exportTypeEl = document.getElementById('exportType');
const statusEl = document.getElementById('status');

// Options
const imageFormatSelect = document.getElementById('imageFormat');
const imageQualitySelect = document.getElementById('imageQuality');
const resolutionSelect = document.getElementById('resolution');

// State variables
let pdfDoc = null;
let pdfFile = null;
let pdfName = '';
let convertedImages = [];
let totalPages = 0;

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners only if elements exist
    if (browseBtn) browseBtn.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    if (convertBtn) convertBtn.addEventListener('click', convertPdfToImages);
    if (clearBtn) clearBtn.addEventListener('click', resetApp);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImages);
    if (resetAppLink) resetAppLink.addEventListener('click', resetApp);
    
    // Set up drag and drop
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        dropArea.addEventListener('drop', handleDrop, false);
    }
    
    // Initialize app
    initApp();
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('dragover');
}

function unhighlight() {
    dropArea.classList.remove('dragover');
}

// Handle file drop
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf') {
            handleFile(file);
        } else {
            alert('Please drop a PDF file only.');
        }
    }
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Process the PDF file
function handleFile(file) {
    pdfFile = file;
    pdfName = file.name.replace('.pdf', '');
    
    // Update stats
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileSizeEl.textContent = `${fileSizeMB} MB`;
    statusEl.textContent = 'File Loaded';
    
    // Enable buttons
    convertBtn.disabled = false;
    clearBtn.disabled = false;
    
    // Show file info
    dropArea.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-file-pdf"></i>
        </div>
        <p class="upload-text">${file.name}</p>
        <p class="upload-subtext">${fileSizeMB} MB • Ready to convert</p>
        <button class="btn btn-secondary" id="changeFileBtn">
            <i class="fas fa-exchange-alt"></i> Change PDF File
        </button>
    `;
    
    // Add event listener to change file button
    document.getElementById('changeFileBtn').addEventListener('click', () => {
        fileInput.click();
    });
}

// Convert PDF to images
async function convertPdfToImages() {
    if (!pdfFile) return;
    
    // Show loading state
    loading.classList.remove('hidden');
    loadingStatus.textContent = 'Loading PDF document...';
    convertBtn.disabled = true;
    
    try {
        // Read the PDF file as array buffer
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Load the PDF document
        loadingStatus.textContent = 'Loading PDF document...';
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;
        
        // Update stats
        pageCountEl.textContent = totalPages;
        exportTypeEl.textContent = totalPages === 1 ? 'Single JPG' : 'ZIP Archive';
        statusEl.textContent = 'Converting...';
        
        // Show stats
        stats.classList.remove('hidden');
        
        // Clear previous images
        convertedImages = [];
        previewContainer.innerHTML = '';
        
        // Convert each page to an image
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            loadingStatus.textContent = `Converting page ${pageNum} of ${totalPages}...`;
            
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ 
                scale: parseFloat(resolutionSelect.value) 
            });
            
            // Create canvas for rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render PDF page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Get image data from canvas
            const imageFormat = imageFormatSelect.value;
            const imageQuality = parseFloat(imageQualitySelect.value);
            
            let imageData;
            if (imageFormat === 'png') {
                imageData = canvas.toDataURL('image/png');
            } else if (imageFormat === 'webp') {
                imageData = canvas.toDataURL('image/webp', imageQuality);
            } else {
                // Default to JPG
                imageData = canvas.toDataURL('image/jpeg', imageQuality);
            }
            
            // Store image data
            convertedImages.push({
                data: imageData,
                page: pageNum,
                format: imageFormat
            });
            
            // Create preview item
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${imageData}" alt="Page ${pageNum}" class="preview-img">
                <div class="preview-info">
                    <h4>Page ${pageNum}</h4>
                    <p>${viewport.width} × ${viewport.height} px • ${imageFormat.toUpperCase()}</p>
                    <button class="btn" style="margin-top: 10px; padding: 8px 16px; font-size: 0.9rem;" data-page="${pageNum}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            
            previewContainer.appendChild(previewItem);
            
            // Add event listener to individual download button
            const downloadBtn = previewItem.querySelector('button');
            downloadBtn.addEventListener('click', () => {
                downloadSingleImage(pageNum - 1);
            });
        }
        
        // Hide loading and show preview
        loading.classList.add('hidden');
        previewSection.classList.remove('hidden');
        statusEl.textContent = 'Conversion Complete';
        
        // Update download button text based on page count
        if (totalPages === 1) {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download JPG Image';
        } else {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download ZIP Archive';
        }
        
    } catch (error) {
        console.error('Error converting PDF:', error);
        loadingStatus.textContent = 'Error converting PDF. Please try again.';
        statusEl.textContent = 'Error';
        alert('Error converting PDF: ' + error.message);
        loading.classList.add('hidden');
    }
}

// Download single image
function downloadSingleImage(index) {
    const image = convertedImages[index];
    const filename = `${pdfName}_page_${image.page}.${image.format}`;
    
    // Convert data URL to blob
    const data = image.data.split(',')[1];
    const mimeType = image.data.split(',')[0].split(':')[1].split(';')[0];
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Save file
    saveAs(blob, filename);
}

// Download all images (either as single JPG or ZIP)
async function downloadImages() {
    if (convertedImages.length === 0) return;
    
    statusEl.textContent = 'Preparing download...';
    
    if (convertedImages.length === 1) {
        // Single page - download as JPG
        downloadSingleImage(0);
    } else {
        // Multiple pages - create ZIP
        loadingStatus.textContent = 'Creating ZIP archive...';
        loading.classList.remove('hidden');
        
        try {
            const zip = new JSZip();
            
            // Add each image to the ZIP
            convertedImages.forEach((image, index) => {
                // Extract image data from data URL
                const data = image.data.split(',')[1];
                
                // Convert base64 to binary string
                const binaryString = atob(data);
                const binaryArray = new Uint8Array(binaryString.length);
                
                for (let i = 0; i < binaryString.length; i++) {
                    binaryArray[i] = binaryString.charCodeAt(i);
                }
                
                // Add file to ZIP
                const filename = `${pdfName}_page_${image.page}.${image.format}`;
                zip.file(filename, binaryArray, { binary: true });
            });
            
            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Download ZIP file
            saveAs(zipBlob, `${pdfName}_converted.zip`);
            
            loading.classList.add('hidden');
            statusEl.textContent = 'Download Complete';
            
        } catch (error) {
            console.error('Error creating ZIP:', error);
            loading.classList.add('hidden');
            statusEl.textContent = 'Error creating ZIP';
            alert('Error creating ZIP archive: ' + error.message);
        }
    }
}

// Reset the application
function resetApp() {
    pdfDoc = null;
    pdfFile = null;
    pdfName = '';
    convertedImages = [];
    totalPages = 0;
    
    // Reset UI
    dropArea.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <p class="upload-text">Drag & Drop your PDF file here</p>
        <p class="upload-subtext">or click to browse files</p>
        <button class="btn" id="browseBtn">Browse PDF Files</button>
    `;
    
    // Reattach event listener to browse button
    document.getElementById('browseBtn').addEventListener('click', () => fileInput.click());
    
    // Hide sections
    loading.classList.add('hidden');
    previewSection.classList.add('hidden');
    stats.classList.add('hidden');
    
    // Reset buttons
    convertBtn.disabled = true;
    clearBtn.disabled = true;
    
    // Reset stats
    pageCountEl.textContent = '0';
    fileSizeEl.textContent = '0 MB';
    exportTypeEl.textContent = '-';
    statusEl.textContent = 'Ready';
    
    // Reset file input
    fileInput.value = '';
}

// Initialize the app
function initApp() {
    resetApp();
}
