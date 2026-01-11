// DOM Elements
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const mergeBtn = document.getElementById('mergeBtn');
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
const pdfCountEl = document.getElementById('pdfCount');
const totalPagesEl = document.getElementById('totalPages');
const totalSizeEl = document.getElementById('totalSize');
const statusEl = document.getElementById('status');

// Options
const outputQualitySelect = document.getElementById('outputQuality');
const pageRotationSelect = document.getElementById('pageRotation');
const metadataSelect = document.getElementById('metadata');
const removeAnnotationsCheckbox = document.getElementById('removeAnnotations');
const compressOutputCheckbox = document.getElementById('compressOutput');
const addBookmarksCheckbox = document.getElementById('addBookmarks');

// State variables
let pdfFiles = [];
let pdfPreviews = [];
let totalPages = 0;
let sortableInstance = null;
let mergedPdfBlob = null;

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing Merge PDF converter');
    
    // Set up event listeners
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (mergeBtn) {
        mergeBtn.addEventListener('click', mergePdfs);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', resetApp);
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadMergedPdf);
    }
    
    if (sortBtn) {
        sortBtn.addEventListener('click', toggleSortMode);
    }
    
    if (removeAllBtn) {
        removeAllBtn.addEventListener('click', removeAllPdfs);
    }
    
    if (reorderBtn) {
        reorderBtn.addEventListener('click', applyReorder);
    }
    
    // Set up drag and drop
    if (dropArea) {
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
    dropArea.classList.add('dragover');
}

function unhighlight(e) {
    dropArea.classList.remove('dragover');
}

// Handle file drop
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const fileArray = Array.from(files);
        handleFiles(fileArray);
    }
}

// Handle file selection
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    if (files.length > 0) {
        handleFiles(files);
    }
}

// Process PDF files
async function handleFiles(files) {
    console.log('Processing PDF files:', files.length);
    
    const validFiles = files.filter(file => {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    });
    
    if (validFiles.length === 0) {
        alert('Please select PDF files only.');
        return;
    }
    
    // Add new files to existing ones
    for (const file of validFiles) {
        // Check for duplicates
        const isDuplicate = pdfFiles.some(f => 
            f.name === file.name && 
            f.size === file.size && 
            f.lastModified === file.lastModified
        );
        
        if (!isDuplicate) {
            console.log('Adding PDF file:', file.name);
            
            try {
                // Read PDF to get page count
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const pageCount = pdfDoc.getPageCount();
                
                pdfFiles.push({
                    file: file,
                    name: file.name,
                    size: file.size,
                    pageCount: pageCount,
                    arrayBuffer: arrayBuffer
                });
                
                totalPages += pageCount;
                
            } catch (error) {
                console.error('Error reading PDF:', error);
                alert(`Error reading PDF file: ${file.name}. Make sure it's a valid PDF.`);
            }
        } else {
            console.log('Skipping duplicate file:', file.name);
        }
    }
    
    updateUI();
    loadPdfPreviews();
}

// Load PDF previews
async function loadPdfPreviews() {
    console.log('Loading PDF previews, total PDFs:', pdfFiles.length);
    
    // Clear existing previews
    previewContainer.innerHTML = '';
    pdfPreviews = [];
    
    // Process each PDF
    for (let i = 0; i < pdfFiles.length; i++) {
        const pdfData = pdfFiles[i];
        
        pdfPreviews.push({
            id: i,
            name: pdfData.name,
            size: pdfData.size,
            pageCount: pdfData.pageCount
        });
        
        // Create preview item
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.setAttribute('data-id', i);
        previewItem.innerHTML = `
            <div class="preview-header">
                <span class="preview-filename">${pdfData.name}</span>
                <button class="remove-btn" data-index="${i}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="preview-img" style="background: linear-gradient(135deg, #4361ee, #7209b7); color: white; display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="preview-info">
                <p>${(pdfData.size / 1024).toFixed(2)} KB</p>
                <p>${pdfData.pageCount} page${pdfData.pageCount !== 1 ? 's' : ''}</p>
            </div>
        `;
        
        previewContainer.appendChild(previewItem);
        
        // Add event listener to remove button
        const removeBtn = previewItem.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            removePdf(index);
        });
    }
    
    // Initialize sortable if not already done
    if (pdfFiles.length > 0 && !sortableInstance) {
        try {
            sortableInstance = Sortable.create(previewContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: function(evt) {
                    console.log('Sort ended, old index:', evt.oldIndex, 'new index:', evt.newIndex);
                    updatePdfOrder();
                }
            });
            console.log('Sortable initialized successfully');
        } catch (error) {
            console.error('Error initializing Sortable:', error);
        }
    }
    
    // Update stats
    const totalSize = pdfFiles.reduce((sum, pdf) => sum + pdf.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    pdfCountEl.textContent = pdfFiles.length;
    totalPagesEl.textContent = totalPages;
    totalSizeEl.textContent = `${totalSizeMB} MB`;
    statusEl.textContent = `${pdfFiles.length} PDF(s) loaded`;
    
    console.log('PDF previews loaded successfully');
}

// Remove single PDF
function removePdf(index) {
    console.log('Removing PDF at index:', index);
    
    if (index < 0 || index >= pdfFiles.length) {
        console.error('Invalid index for removal:', index);
        return;
    }
    
    // Subtract page count before removing
    totalPages -= pdfFiles[index].pageCount;
    
    pdfFiles.splice(index, 1);
    pdfPreviews = [];
    
    console.log('PDF removed, remaining files:', pdfFiles.length);
    
    updateUI();
    loadPdfPreviews();
}

// Remove all PDFs
function removeAllPdfs() {
    console.log('Removing all PDFs');
    pdfFiles = [];
    pdfPreviews = [];
    totalPages = 0;
    mergedPdfBlob = null;
    previewContainer.innerHTML = '';
    updateUI();
}

// Update PDF order after drag & drop
function updatePdfOrder() {
    console.log('Updating PDF order');
    
    const newOrder = Array.from(previewContainer.children).map(child => {
        return parseInt(child.getAttribute('data-id'));
    });
    
    console.log('New order:', newOrder);
    
    // Reorder pdfFiles array based on new order
    const reorderedFiles = newOrder.map(id => pdfFiles[id]);
    pdfFiles = reorderedFiles;
    
    // Update stats
    const totalSize = pdfFiles.reduce((sum, pdf) => sum + pdf.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    pdfCountEl.textContent = pdfFiles.length;
    totalPagesEl.textContent = totalPages;
    totalSizeEl.textContent = `${totalSizeMB} MB`;
    statusEl.textContent = 'Reordered';
    
    console.log('PDF order updated');
}

// Apply reorder
function applyReorder() {
    console.log('Applying reorder');
    updatePdfOrder();
    statusEl.textContent = 'Order applied';
    setTimeout(() => {
        statusEl.textContent = `${pdfFiles.length} PDF(s) loaded`;
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
    console.log('Updating UI, PDF count:', pdfFiles.length);
    
    const hasPdfs = pdfFiles.length > 0;
    const hasMergedPdf = mergedPdfBlob !== null;
    
    mergeBtn.disabled = !hasPdfs || pdfFiles.length < 2;
    clearBtn.disabled = !hasPdfs;
    sortBtn.disabled = !hasPdfs || pdfFiles.length < 2;
    downloadBtn.disabled = !hasMergedPdf;
    removeAllBtn.disabled = !hasPdfs;
    reorderBtn.disabled = !hasPdfs;
    
    if (hasPdfs) {
        dropArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <p class="upload-text">${pdfFiles.length} PDF(s) loaded</p>
            <p class="upload-subtext">Ready to merge ${totalPages} pages</p>
            <button class="btn btn-secondary" id="addMoreBtn">
                <i class="fas fa-plus"></i> Add More PDFs
            </button>
        `;
        
        // Add event listener to add more button
        const addMoreBtn = document.getElementById('addMoreBtn');
        if (addMoreBtn) {
            addMoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
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
            <p class="upload-text">Drag & Drop your PDFs here</p>
            <p class="upload-subtext">or click to browse files (PDF format only)</p>
            <button class="btn" id="browseBtn">Browse PDFs</button>
        `;
        
        // Reattach event listener to browse button
        const newBrowseBtn = document.getElementById('browseBtn');
        if (newBrowseBtn) {
            newBrowseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }
        
        previewSection.classList.add('hidden');
        stats.classList.add('hidden');
    }
}

// Merge PDFs
async function mergePdfs() {
    if (pdfFiles.length < 2) {
        alert('Please add at least 2 PDF files to merge!');
        return;
    }
    
    console.log('Starting PDF merge with', pdfFiles.length, 'PDFs');
    
    // Show loading state
    loading.classList.remove('hidden');
    loadingStatus.textContent = 'Creating merged PDF...';
    mergeBtn.disabled = true;
    downloadBtn.disabled = true;
    
    try {
        // Create a new PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Get options
        const outputQuality = outputQualitySelect.value;
        const pageRotation = pageRotationSelect.value;
        const preserveMetadata = metadataSelect.value;
        const removeAnnotations = removeAnnotationsCheckbox.checked;
        const compress = compressOutputCheckbox.checked;
        const addBookmarks = addBookmarksCheckbox.checked;
        
        console.log('Merge Settings:', {
            outputQuality,
            pageRotation,
            preserveMetadata,
            removeAnnotations,
            compress,
            addBookmarks
        });
        
        // Copy pages from each PDF
        for (let i = 0; i < pdfFiles.length; i++) {
            loadingStatus.textContent = `Processing PDF ${i + 1} of ${pdfFiles.length}...`;
            console.log(`Processing PDF ${i + 1}/${pdfFiles.length}: ${pdfFiles[i].name}`);
            
            try {
                // Load the PDF
                const pdfBytes = pdfFiles[i].arrayBuffer;
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
                
                // Copy all pages
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                
                // Add each page to merged PDF
                for (let j = 0; j < pages.length; j++) {
                    const page = pages[j];
                    
                    // Apply rotation if needed
                    if (pageRotation === 'portrait') {
                        page.setRotation(PDFLib.degrees(0));
                    } else if (pageRotation === 'landscape') {
                        page.setRotation(PDFLib.degrees(90));
                    }
                    
                    mergedPdf.addPage(page);
                    
                    // Add bookmark if enabled
                    if (addBookmarks && j === 0) {
                        // Create bookmark for first page of each PDF
                        const pageIndex = mergedPdf.getPageCount() - pages.length + j;
                        mergedPdf.addBookmark({
                            title: `PDF ${i + 1}: ${pdfFiles[i].name}`,
                            pageIndex: pageIndex,
                            color: PDFLib.rgb(0.2, 0.4, 0.8)
                        });
                    }
                }
                
                console.log(`Added ${pages.length} pages from ${pdfFiles[i].name}`);
                
            } catch (error) {
                console.error(`Error processing PDF ${i + 1}:`, error);
                throw new Error(`Failed to process PDF: ${pdfFiles[i].name}`);
            }
        }
        
        // Set document metadata
        if (preserveMetadata !== 'none') {
            mergedPdf.setTitle(`Merged PDF - ${new Date().toLocaleDateString()}`);
            mergedPdf.setAuthor('PDF Tools Pro');
            mergedPdf.setCreator('PDF Tools Pro Web App');
            mergedPdf.setCreationDate(new Date());
            mergedPdf.setModificationDate(new Date());
        }
        
        // Save the merged PDF
        const pdfBytes = await mergedPdf.save({
            useObjectStreams: compress,
            addDefaultPage: false,
            updateFieldAppearances: false
        });
        
        // Create blob
        mergedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        console.log('PDF merged successfully, size:', mergedPdfBlob.size, 'bytes');
        
        // Hide loading and update status
        loading.classList.add('hidden');
        statusEl.textContent = 'PDF Merged Successfully';
        downloadBtn.disabled = false;
        
        // Re-enable merge button
        mergeBtn.disabled = false;
        
        // Show download button
        downloadBtn.classList.add('btn-success');
        
    } catch (error) {
        console.error('Error merging PDFs:', error);
        loadingStatus.textContent = 'Error merging PDFs';
        statusEl.textContent = 'Error';
        
        let errorMessage = 'Error merging PDFs. ';
        if (error.message.includes('PDF')) {
            errorMessage += 'Make sure all files are valid PDF documents.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        loading.classList.add('hidden');
        mergeBtn.disabled = false;
        downloadBtn.disabled = false;
    }
}

// Download merged PDF
function downloadMergedPdf() {
    if (!mergedPdfBlob) {
        alert('No merged PDF available. Please merge files first.');
        return;
    }
    
    console.log('Downloading merged PDF');
    
    const url = URL.createObjectURL(mergedPdfBlob);
    const fileName = `merged_pdf_${Date.now()}.pdf`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    statusEl.textContent = 'Download started';
    setTimeout(() => {
        statusEl.textContent = `${pdfFiles.length} PDF(s) loaded`;
    }, 2000);
}

// Reset the application
function resetApp() {
    console.log('Resetting application');
    
    pdfFiles = [];
    pdfPreviews = [];
    totalPages = 0;
    mergedPdfBlob = null;
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
    pdfCountEl.textContent = '0';
    totalPagesEl.textContent = '0';
    totalSizeEl.textContent = '0 MB';
    statusEl.textContent = 'Ready';
    
    // Hide sections
    loading.classList.add('hidden');
    
    // Reset sort button
    sortBtn.innerHTML = '<i class="fas fa-sort"></i> Sort PDFs';
    sortBtn.classList.remove('btn-secondary');
    
    // Reset download button
    downloadBtn.classList.remove('btn-success');
    downloadBtn.disabled = true;
    
    console.log('Application reset complete');
}

// Initialize the app
function initApp() {
    console.log('Initializing Merge PDF application');
    resetApp();
}
