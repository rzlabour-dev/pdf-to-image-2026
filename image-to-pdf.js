// DOM Elements
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const sortBtn = document.getElementById('sortBtn');
const removeAllBtn = document.getElementById('removeAllBtn');
const reorderBtn = document.getElementById('reorderBtn');
const loading = document.getElementById('loading');
const loadingStatus = document.getElementById('loadingStatus');
const previewSection = document.getElementById('previewSection');
const previewContainer = document.getElementById('previewContainer');
const stats = document.getElementById('stats');

// Stats elements
const imageCountEl = document.getElementById('imageCount');
const totalSizeEl = document.getElementById('totalSize');
const pdfPagesEl = document.getElementById('pdfPages');
const statusEl = document.getElementById('status');

// Options
const pageSizeSelect = document.getElementById('pageSize');
const orientationSelect = document.getElementById('orientation');
const marginSelect = document.getElementById('margin');
const imageOrderCheckbox = document.getElementById('imageOrder');
const compressImagesCheckbox = document.getElementById('compressImages');
const addPageNumbersCheckbox = document.getElementById('addPageNumbers');

// State variables
let images = [];
let imageFiles = [];
let sortableInstance = null;

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing Image to PDF converter');
    
    // Set up event listeners
    if (browseBtn) {
        console.log('Setting up browse button');
        browseBtn.addEventListener('click', () => {
            console.log('Browse button clicked');
            fileInput.click();
        });
    }
    
    if (fileInput) {
        console.log('Setting up file input');
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (convertBtn) {
        console.log('Setting up convert button');
        convertBtn.addEventListener('click', convertToPdf);
    }
    
    if (clearBtn) {
        console.log('Setting up clear button');
        clearBtn.addEventListener('click', resetApp);
    }
    
    if (downloadBtn) {
        console.log('Setting up download button');
        downloadBtn.addEventListener('click', downloadPdf);
    }
    
    if (sortBtn) {
        console.log('Setting up sort button');
        sortBtn.addEventListener('click', toggleSortMode);
    }
    
    if (removeAllBtn) {
        console.log('Setting up remove all button');
        removeAllBtn.addEventListener('click', removeAllImages);
    }
    
    if (reorderBtn) {
        console.log('Setting up reorder button');
        reorderBtn.addEventListener('click', applyReorder);
    }
    
    // Set up drag and drop
    if (dropArea) {
        console.log('Setting up drag and drop area');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        // Unhighlight drop area
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        // Handle dropped files
        dropArea.addEventListener('drop', handleDrop, false);
        
        // Also allow click to browse
        dropArea.addEventListener('click', () => {
            console.log('Drop area clicked');
            fileInput.click();
        });
    }
    
    // Initialize app
    initApp();
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    console.log('Drag enter/over');
    dropArea.classList.add('dragover');
}

function unhighlight(e) {
    console.log('Drag leave/drop');
    dropArea.classList.remove('dragover');
}

// Handle file drop
function handleDrop(e) {
    console.log('File dropped');
    const dt = e.dataTransfer;
    const files = dt.files;
    
    console.log('Number of files dropped:', files.length);
    
    if (files.length > 0) {
        const fileArray = Array.from(files);
        console.log('Files:', fileArray.map(f => ({name: f.name, type: f.type, size: f.size})));
        handleFiles(fileArray);
    } else {
        console.log('No files in drop event');
    }
}

// Handle file selection
function handleFileSelect(e) {
    console.log('File input changed');
    const files = Array.from(e.target.files);
    console.log('Number of files selected:', files.length);
    console.log('Files:', files.map(f => ({name: f.name, type: f.type, size: f.size})));
    
    if (files.length > 0) {
        handleFiles(files);
    } else {
        console.log('No files selected');
    }
}

// Process image files
function handleFiles(files) {
    console.log('Processing files:', files.length);
    
    const validFiles = files.filter(file => {
        const isValid = file.type.startsWith('image/');
        console.log(`File ${file.name}: type=${file.type}, valid=${isValid}`);
        return isValid;
    });
    
    console.log('Valid image files:', validFiles.length);
    
    if (validFiles.length === 0) {
        alert('Please select image files only (JPG, PNG, WebP, etc.)');
        return;
    }
    
    // Add new files to existing ones
    validFiles.forEach(file => {
        // Check for duplicates
        const isDuplicate = imageFiles.some(f => 
            f.name === file.name && 
            f.size === file.size && 
            f.lastModified === file.lastModified
        );
        
        if (!isDuplicate) {
            console.log('Adding file:', file.name);
            imageFiles.push(file);
        } else {
            console.log('Skipping duplicate file:', file.name);
        }
    });
    
    console.log('Total files after adding:', imageFiles.length);
    
    updateUI();
    loadImagePreviews();
}

// Load image previews
async function loadImagePreviews() {
    console.log('Loading image previews, total images:', imageFiles.length);
    
    // Clear existing previews
    previewContainer.innerHTML = '';
    images = [];
    
    // Process each image
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        console.log(`Processing image ${i + 1}/${imageFiles.length}:`, file.name);
        
        try {
            const imageData = await readFileAsDataURL(file);
            
            images.push({
                id: i,
                src: imageData,
                name: file.name,
                size: file.size,
                file: file
            });
            
            // Create preview item
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.setAttribute('data-id', i);
            previewItem.innerHTML = `
                <div class="preview-header">
                    <span class="preview-filename">${file.name}</span>
                    <button class="remove-btn" data-index="${i}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <img src="${imageData}" alt="${file.name}" class="preview-img">
                <div class="preview-info">
                    <p>${(file.size / 1024).toFixed(2)} KB</p>
                    <p>Image ${i + 1}</p>
                </div>
            `;
            
            previewContainer.appendChild(previewItem);
            
            // Add event listener to remove button
            const removeBtn = previewItem.querySelector('.remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                console.log('Remove button clicked for index:', index);
                removeImage(index);
            });
            
        } catch (error) {
            console.error('Error loading image preview:', error);
        }
    }
    
    // Initialize sortable if not already done
    if (imageFiles.length > 0 && !sortableInstance) {
        console.log('Initializing Sortable');
        try {
            sortableInstance = Sortable.create(previewContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: function(evt) {
                    console.log('Sort ended, old index:', evt.oldIndex, 'new index:', evt.newIndex);
                    updateImageOrder();
                }
            });
            console.log('Sortable initialized successfully');
        } catch (error) {
            console.error('Error initializing Sortable:', error);
        }
    }
    
    // Update stats
    const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    imageCountEl.textContent = imageFiles.length;
    totalSizeEl.textContent = `${totalSizeMB} MB`;
    pdfPagesEl.textContent = imageFiles.length;
    statusEl.textContent = `${imageFiles.length} image(s) loaded`;
    
    console.log('Image previews loaded successfully');
}

// Helper function to read file as Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

// Remove single image
function removeImage(index) {
    console.log('Removing image at index:', index);
    
    if (index < 0 || index >= imageFiles.length) {
        console.error('Invalid index for removal:', index);
        return;
    }
    
    imageFiles.splice(index, 1);
    
    // Reassign IDs
    images = [];
    
    console.log('Image removed, remaining files:', imageFiles.length);
    
    updateUI();
    loadImagePreviews();
}

// Remove all images
function removeAllImages() {
    console.log('Removing all images');
    imageFiles = [];
    images = [];
    previewContainer.innerHTML = '';
    updateUI();
}

// Update image order after drag & drop
function updateImageOrder() {
    console.log('Updating image order');
    
    const newOrder = Array.from(previewContainer.children).map(child => {
        return parseInt(child.getAttribute('data-id'));
    });
    
    console.log('New order:', newOrder);
    
    // Reorder imageFiles array based on new order
    const reorderedFiles = newOrder.map(id => imageFiles[id]);
    imageFiles = reorderedFiles;
    
    // Update stats
    const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    imageCountEl.textContent = imageFiles.length;
    totalSizeEl.textContent = `${totalSizeMB} MB`;
    statusEl.textContent = 'Reordered';
    
    console.log('Image order updated');
}

// Apply reorder
function applyReorder() {
    console.log('Applying reorder');
    updateImageOrder();
    statusEl.textContent = 'Order applied';
    setTimeout(() => {
        statusEl.textContent = `${imageFiles.length} image(s) loaded`;
    }, 2000);
}

// Toggle sort mode
function toggleSortMode() {
    if (sortableInstance) {
        const isDisabled = !sortableInstance.option('disabled');
        sortableInstance.option('disabled', isDisabled);
        
        sortBtn.innerHTML = isDisabled 
            ? '<i class="fas fa-sort"></i> Enable Sorting' 
            : '<i class="fas fa-sort"></i> Disable Sorting';
        
        sortBtn.classList.toggle('btn-secondary', !isDisabled);
        
        console.log('Sort mode toggled, disabled:', isDisabled);
        statusEl.textContent = isDisabled ? 'Sorting disabled' : 'Sorting enabled';
    }
}

// Update UI based on state
function updateUI() {
    console.log('Updating UI, image count:', imageFiles.length);
    
    const hasImages = imageFiles.length > 0;
    
    convertBtn.disabled = !hasImages;
    clearBtn.disabled = !hasImages;
    sortBtn.disabled = !hasImages;
    downloadBtn.disabled = !hasImages;
    removeAllBtn.disabled = !hasImages;
    reorderBtn.disabled = !hasImages;
    
    if (hasImages) {
        dropArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-images"></i>
            </div>
            <p class="upload-text">${imageFiles.length} image(s) loaded</p>
            <p class="upload-subtext">Ready to convert to PDF</p>
            <button class="btn btn-secondary" id="addMoreBtn">
                <i class="fas fa-plus"></i> Add More Images
            </button>
        `;
        
        // Add event listener to add more button
        const addMoreBtn = document.getElementById('addMoreBtn');
        if (addMoreBtn) {
            addMoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Add more button clicked');
                fileInput.click();
            });
        }
        
        previewSection.classList.remove('hidden');
        stats.classList.remove('hidden');
        
    } else {
        dropArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <p class="upload-text">Drag & Drop your images here</p>
            <p class="upload-subtext">or click to browse files (JPG, PNG, WebP supported)</p>
            <button class="btn" id="browseBtn">Browse Images</button>
        `;
        
        // Reattach event listener to browse button
        const newBrowseBtn = document.getElementById('browseBtn');
        if (newBrowseBtn) {
            newBrowseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Browse button clicked');
                fileInput.click();
            });
        }
        
        previewSection.classList.add('hidden');
        stats.classList.add('hidden');
    }
}

// Convert images to PDF
async function convertToPdf() {
    if (images.length === 0) {
        alert('Please add some images first!');
        return;
    }
    
    console.log('Starting PDF conversion with', images.length, 'images');
    
    // Show loading state
    loading.classList.remove('hidden');
    loadingStatus.textContent = 'Creating PDF document...';
    convertBtn.disabled = true;
    downloadBtn.disabled = true;
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        const pageSize = pageSizeSelect.value;
        const orientation = orientationSelect.value;
        const margin = parseInt(marginSelect.value);
        const compress = compressImagesCheckbox.checked;
        const addNumbers = addPageNumbersCheckbox.checked;
        
        console.log('PDF Settings:', {
            pageSize,
            orientation,
            margin,
            compress,
            addNumbers
        });
        
        // Set PDF properties
        let pageWidth, pageHeight;
        
        switch(pageSize) {
            case 'a4':
                pageWidth = 210;
                pageHeight = 297;
                break;
            case 'letter':
                pageWidth = 215.9;
                pageHeight = 279.4;
                break;
            case 'legal':
                pageWidth = 215.9;
                pageHeight = 355.6;
                break;
            default: // auto
                pageWidth = 210;
                pageHeight = 297;
        }
        
        if (orientation === 'landscape') {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
        }
        
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);
        
        console.log('Page dimensions:', { pageWidth, pageHeight, contentWidth, contentHeight });
        
        // Add each image as a page
        for (let i = 0; i < images.length; i++) {
            loadingStatus.textContent = `Processing image ${i + 1} of ${images.length}...`;
            console.log(`Processing image ${i + 1}/${images.length}`);
            
            if (i > 0) {
                pdf.addPage();
            }
            
            const image = images[i];
            
            try {
                // Load image to get dimensions
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = image.src;
                });
                
                console.log(`Image ${i + 1} dimensions:`, img.width, 'x', img.height);
                
                // Calculate image dimensions to fit content area
                let imgWidth, imgHeight;
                const aspectRatio = img.width / img.height;
                
                if (pageSize === 'auto') {
                    // Auto fit - maintain aspect ratio, fit to page
                    if (contentWidth / contentHeight > aspectRatio) {
                        imgHeight = contentHeight;
                        imgWidth = imgHeight * aspectRatio;
                    } else {
                        imgWidth = contentWidth;
                        imgHeight = imgWidth / aspectRatio;
                    }
                } else {
                    // Fit to content area maintaining aspect ratio
                    if (contentWidth / contentHeight > aspectRatio) {
                        imgHeight = contentHeight;
                        imgWidth = imgHeight * aspectRatio;
                    } else {
                        imgWidth = contentWidth;
                        imgHeight = imgWidth / aspectRatio;
                    }
                }
                
                console.log(`Image ${i + 1} scaled to:`, imgWidth, 'x', imgHeight);
                
                // Center image on page
                const x = margin + (contentWidth - imgWidth) / 2;
                const y = margin + (contentHeight - imgHeight) / 2;
                
                console.log(`Image ${i + 1} position:`, x, y);
                
                // Add image to PDF
                pdf.addImage(
                    image.src,
                    'JPEG', // format (jsPDF will convert)
                    x, y,
                    imgWidth, imgHeight,
                    `image${i}`,
                    compress ? 'FAST' : 'NONE',
                    0
                );
                
                // Add page number if enabled
                if (addNumbers) {
                    pdf.setFontSize(10);
                    pdf.setTextColor(128, 128, 128);
                    pdf.text(
                        `Page ${i + 1} of ${images.length}`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                }
                
                console.log(`Image ${i + 1} added to PDF successfully`);
                
            } catch (imgError) {
                console.error(`Error processing image ${i + 1}:`, imgError);
                throw new Error(`Failed to process image ${image.name}`);
            }
        }
        
        // Save PDF
        const pdfBlob = pdf.output('blob');
        const fileName = `converted_images_${Date.now()}.pdf`;
        
        console.log('PDF created successfully, size:', pdfBlob.size, 'bytes');
        
        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Hide loading and update status
        loading.classList.add('hidden');
        statusEl.textContent = 'PDF Created Successfully';
        
        // Re-enable buttons
        setTimeout(() => {
            convertBtn.disabled = false;
            downloadBtn.disabled = false;
            statusEl.textContent = `${imageFiles.length} image(s) loaded`;
        }, 2000);
        
    } catch (error) {
        console.error('Error creating PDF:', error);
        loadingStatus.textContent = 'Error creating PDF';
        statusEl.textContent = 'Error';
        
        let errorMessage = 'Error creating PDF. ';
        if (error.message.includes('jsPDF')) {
            errorMessage += 'Make sure jsPDF library is loaded properly.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        loading.classList.add('hidden');
        convertBtn.disabled = false;
        downloadBtn.disabled = false;
    }
}

// Download PDF
function downloadPdf() {
    console.log('Download PDF button clicked');
    convertToPdf();
}

// Reset the application
function resetApp() {
    console.log('Resetting application');
    
    imageFiles = [];
    images = [];
    previewContainer.innerHTML = '';
    
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    
    // Reset file input
    fileInput.value = '';
    
    // Reset UI
    updateUI();
    
    // Reset stats
    imageCountEl.textContent = '0';
    totalSizeEl.textContent = '0 MB';
    pdfPagesEl.textContent = '0';
    statusEl.textContent = 'Ready';
    
    // Hide sections
    loading.classList.add('hidden');
    
    // Reset sort button
    sortBtn.innerHTML = '<i class="fas fa-sort"></i> Sort Images';
    sortBtn.classList.remove('btn-secondary');
    
    console.log('Application reset complete');
}

// Initialize the app
function initApp() {
    console.log('Initializing Image to PDF application');
    resetApp();
}
