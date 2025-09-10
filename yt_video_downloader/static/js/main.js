// main.js

// --- CSRF Token Helper ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

// --- Global UI Element Selectors ---
const videoUrlInput = $('#videoUrl');
const formatTypeSelect = $('#formatType');
const qualitySelectGroup = $('#quality-select-group');
const qualitySelect = $('#quality');
const downloadButton = $('#downloadButton');
const cancelDownloadButton = $('#cancelDownloadButton');
const messagesDiv = $('#messages');
const downloadLinkDiv = $('#downloadLink');
const loadingBarContainer = $('#loadingBarContainer');
const loadingBar = $('#loadingBar');
const loadingText = $('#loadingText');
const thumbnailContainer = $('#thumbnail-container');
const thumbnailPreview = $('#thumbnailPreview');
const videoTitleDisplay = $('#video-title-display');
const videoIdInput = $('#videoId'); // Hidden input to store video ID
const downloadSizeInfo = $('#downloadSizeInfo'); // Div for size info
const downloadedBytesSpan = $('#downloadedBytes'); // Span for downloaded bytes
const totalBytesSpan = $('#totalBytes'); // Span for total bytes

// NEW UI Elements
const estimatedInfoSection = $('#estimatedInfoSection');
const estimatedSizeDisplay = $('#estimatedSizeDisplay');
const etaDisplayContainer = $('#etaDisplayContainer'); // Container for ETA
const estimatedTimeDisplay = $('#estimatedTimeDisplay');

// --- Quality Map (for display names, sizes will come from backend) ---
const qualityDisplayMap = {
    '4320p': 'Best (8K)',
    '2880p': 'High (5K)',
    '2160p': 'Best (4K)',
    '1440p': 'High (2K)',
    '1080p': 'Full HD (1080p)',
    '720p': 'HD (720p)',
    '480p': 'SD (480p)',
    '360p': 'Low (360p)',
    '240p': 'Very Low (240p)',
    '144p': 'Very Low (144p)',
    '320kbps': 'Best (320kbps)',
    '256kbps': 'High (256kbps)',
    '192kbps': 'Medium (192kbps)',
    '128kbps': 'Standard (128kbps)',
    '96kbps': 'Low (96kbps)',
    '64kbps': 'Very Low (64kbps)'
};

// --- Helper Functions for UI State and Messages ---

function showMessage(message, type = 'info') {
    messagesDiv.html(`<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`)
        .css('opacity', 0)
        .removeClass('error info success')
        .addClass(type)
        .fadeTo(300, 1);
    // Only auto-hide info/success messages if they don't contain a download link
    if (type !== 'error' && messagesDiv.html().trim() !== '' && !messagesDiv.find('a').length) {
        setTimeout(() => messagesDiv.fadeOut(300, function() {
            $(this).empty();
        }), 5000);
    }
}

function resetUIState() {
    clearTimeout(thumbnailFetchTimeout);
    stopProgressPolling();
    thumbnailContainer.stop().fadeOut(300, function() {
        $(this).hide();
        thumbnailPreview.attr('src', '');
        videoTitleDisplay.text('');
        thumbnailContainer.removeData('is_short'); // Clear is_short data
        videoIdInput.val('');
        thumbnailContainer.removeData('lastFetchedDetails');
    });
    messagesDiv.stop().fadeOut(300, function() {
        $(this).empty();
    });
    downloadLinkDiv.stop().fadeOut(300, function() {
        $(this).empty();
    });

    qualitySelectGroup.stop().fadeIn(300); // Ensure quality group is visible for non-shorts
    qualitySelect.empty().append('<option value="">Enter URL to load qualities</option>').prop('disabled', true);
    downloadButton.prop('disabled', true).html('<i class="fas fa-download"></i> Download');
    cancelDownloadButton.stop().fadeOut(300);

    // Reset and hide the separate loading bar and its info
    loadingBarContainer.hide();
    loadingBar.css('width', '0%');
    loadingText.text('Processing your request...');

    downloadSizeInfo.hide();
    downloadedBytesSpan.text('0 Bytes');
    totalBytesSpan.text('N/A');

    // Reset and hide estimated info section
    estimatedInfoSection.hide();
    estimatedSizeDisplay.text('N/A');
    etaDisplayContainer.hide();
    estimatedTimeDisplay.text('N/A');
}

// --- Progress Bar Control (for the separate green bar) ---
// No longer using loadingInterval for random animation, width is driven by polling data.
function startProgressBar(text) {
    loadingText.text(text);
    loadingBar.css('width', '0%');
    // The loadingBar's color is now set in style.css to be green by default

    loadingBarContainer.css('opacity', 0).fadeIn(300);
    // ETA will be shown by polling, so we don't hide it here.
}

function stopProgressBar() {
    // No need to clear loadingInterval here, as it's for polling, not animation.
    loadingBar.css('width', '100%'); // Ensure the bar is full
    loadingText.text('Download Complete!');
    downloadSizeInfo.fadeOut(300);
    etaDisplayContainer.fadeOut(300); // Hide ETA when complete
    setTimeout(() => {
        loadingBarContainer.fadeOut(800, function() {
            $(this).hide();
            loadingBar.css('width', '0%');
            loadingText.text('Processing your request...');
        });
    }, 1000);
}

function updateDownloadButtonState() {
    const url = videoUrlInput.val().trim();
    const isShort = thumbnailContainer.data('is_short');
    const selectedQuality = qualitySelect.val();

    // Button is enabled if URL exists AND (it's a Short OR (quality is enabled AND selected))
    if (url && (isShort || (!qualitySelect.prop('disabled') && selectedQuality))) {
        downloadButton.prop('disabled', false);
    } else {
        downloadButton.prop('disabled', true);
    }
}

// --- Thumbnail and Title Fetching Logic ---
let thumbnailFetchTimeout;

function fetchVideoDetails() {
    const videoUrl = videoUrlInput.val().trim();

    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    if (!urlRegex.test(videoUrl)) {
        resetUIState();
        showMessage('Please enter a valid YouTube or video URL.', 'error');
        return;
    }

    startProgressBar('Fetching video details and available qualities...'); // This will show the separate bar
    downloadSizeInfo.hide();
    estimatedInfoSection.hide(); // Hide estimated info section during fetch
    etaDisplayContainer.hide(); // Ensure ETA is hidden

    qualitySelect.empty().append('<option value="">Fetching qualities...</option>').prop('disabled', true);
    downloadButton.prop('disabled', true);
    thumbnailContainer.css('opacity', 0).hide();

    clearTimeout(thumbnailFetchTimeout);
    thumbnailFetchTimeout = setTimeout(() => {
        $.ajax({
            url: '/fetch_video_details/',
            type: 'POST',
            data: JSON.stringify({
                video_url: videoUrl
            }),
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function(data) {
                stopProgressBar(); // Hide the separate bar after fetch
                if (data.status === "success") {
                    thumbnailPreview.attr('src', data.thumbnail_url);
                    videoTitleDisplay.text(data.title || 'N/A');
                    thumbnailContainer.fadeIn(500).css('opacity', 1);
                    thumbnailContainer.data('is_short', data.is_short); // Store is_short status
                    videoIdInput.val(data.video_id);
                    thumbnailContainer.data('lastFetchedDetails', data);

                    if (data.is_short) {
                        qualitySelectGroup.fadeOut(300, function() {
                            $(this).hide();
                            qualitySelect.empty().append('<option value="best_short">Best Quality (Short)</option>');
                            qualitySelect.prop('disabled', true); // Disable quality selection for shorts
                        });
                        showMessage('This is a YouTube Short. It will be downloaded in the highest available quality (vertical format).', 'info');
                        estimatedInfoSection.hide(); // No estimated info for shorts
                    } else {
                        qualitySelectGroup.fadeIn(300);
                        populateQualityDropdown(formatTypeSelect.val(), data.available_mp4_qualities, data.available_mp3_qualities);
                        // After populating, show the estimated info section and update size
                        estimatedInfoSection.fadeIn(300); // Ensure section is shown
                        updateEstimatedSizeDisplay(); // Call to update initial size
                    }
                    updateDownloadButtonState();
                } else {
                    resetUIState();
                    showMessage(data.message || 'Could not fetch video details.', 'error');
                }
            },
            error: function(xhr, status, error) {
                stopProgressBar(); // Hide the separate bar on error
                resetUIState();
                let errorMessage = 'Error fetching video details.';
                try {
                    const errorJson = JSON.parse(xhr.responseText);
                    errorMessage = 'Server Error: ' + (errorJson.message || errorJson.error || 'Unknown.');
                } catch (e) {
                    errorMessage = `An unexpected network error occurred. Status: ${xhr.status}. Error: ${error || xhr.statusText}.`;
                }
                showMessage(errorMessage, 'error');
                console.error("AJAX Error during fetchDetails:", error, xhr.responseText, xhr.status);
            }
        });
    }, 500);
}

function populateQualityDropdown(format, mp4Qualities, mp3Qualities) {
    qualitySelect.empty();

    let qualitiesToUse = [];
    if (format === 'mp4') {
        qualitiesToUse = mp4Qualities || [];
    } else if (format === 'mp3') {
        qualitiesToUse = mp3Qualities || [];
    }

    if (qualitiesToUse.length === 0) {
        qualitySelect.append('<option value="">No qualities available</option>');
        qualitySelect.prop('disabled', true);
        showMessage(`No ${format.toUpperCase()} qualities found for this video. Try the other format or another video.`, 'error');
        estimatedInfoSection.hide(); // Hide if no qualities
    } else {
        qualitySelect.prop('disabled', false);
        qualitiesToUse.sort((a, b) => b.size_bytes - a.size_bytes);

        qualitySelect.append('<option value="">Select quality...</option>');
        for (let qualityData of qualitiesToUse) {
            const displayQuality = qualityData.quality;
            const optionText = `${qualityDisplayMap[displayQuality] || displayQuality}`;
            qualitySelect.append(`<option value="${displayQuality}" data-size-bytes="${qualityData.size_bytes}">${optionText}</option>`);
        }
        if (qualitiesToUse.length > 0) {
            qualitySelect.val(qualitiesToUse[0].quality); // Select highest quality by default
        }
        estimatedInfoSection.fadeIn(300); // Ensure estimated info section is shown
    }
    updateDownloadButtonState();
}

// Function to update the estimated size display
function updateEstimatedSizeDisplay() {
    const selectedOption = qualitySelect.find('option:selected');
    const estimatedSizeBytes = selectedOption.data('size-bytes');
    if (estimatedSizeBytes !== undefined && selectedOption.val() !== "") { // Check if a valid option is selected
        estimatedSizeDisplay.text(formatBytes(estimatedSizeBytes));
        estimatedInfoSection.fadeIn(300); // Ensure section is visible when size is updated
    } else {
        estimatedSizeDisplay.text('N/A');
        estimatedInfoSection.hide(); // Hide if no size is available or no option selected
    }
}


// --- Event Listeners ---
videoUrlInput.on("input", function() {
    resetUIState();
    if (this.value.trim() !== '') {
        fetchVideoDetails();
    }
});

formatTypeSelect.on('change', function() {
    const videoUrl = videoUrlInput.val().trim();
    // Only re-populate qualities if it's not a short
    if (videoUrl && !thumbnailContainer.data('is_short')) {
        const lastFetchedDetails = thumbnailContainer.data('lastFetchedDetails');
        if (lastFetchedDetails) {
            populateQualityDropdown(formatTypeSelect.val(), lastFetchedDetails.available_mp4_qualities, lastFetchedDetails.available_mp3_qualities);
            updateEstimatedSizeDisplay(); // Update size when format changes
        }
    }
    updateDownloadButtonState();
});

// Quality selection change now updates estimated size and ensures section visibility
qualitySelect.on('change', function() {
    updateEstimatedSizeDisplay(); // Update size when quality changes
    updateDownloadButtonState();
});


// --- AJAX Download Logic ---
let xhrDownload = null;
let progressPollingInterval = null;

$('#downloadForm').submit(function(e) {
    e.preventDefault();

    messagesDiv.stop().fadeOut(300, function() {
        $(this).empty();
    });
    downloadLinkDiv.stop().fadeOut(300, function() {
        $(this).empty();
    });

    downloadButton.prop('disabled', true).html('<div class="spinner"></div> Initiating Download...');
    cancelDownloadButton.fadeIn(300);

    const url = videoUrlInput.val();
    const format_type = formatTypeSelect.val();
    let quality = qualitySelect.val();
    const isShort = thumbnailContainer.data('is_short');
    const video_id = videoIdInput.val();

    if (!video_id) {
        stopProgressBar();
        downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download');
        cancelDownloadButton.fadeOut(300);
        showMessage('Error: Video ID not found. Please re-enter URL and try again.', 'error');
        return;
    }

    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    if (!urlRegex.test(url)) {
        stopProgressBar();
        downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download');
        cancelDownloadButton.fadeOut(300);
        showMessage('Please enter a valid URL for download.', 'error');
        return;
    }

    // If it's a short, force quality to 'best_short'
    if (isShort) {
        quality = 'best_short';
    } else if (qualitySelect.prop('disabled') || !quality) { // For non-shorts, quality must be selected
        stopProgressBar();
        downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download');
        cancelDownloadButton.fadeOut(300);
        showMessage('Please select a valid quality for long videos.', 'error');
        return;
    }

    startProgressPolling(video_id); // This will start showing the separate green bar
    startProgressBar('Starting download...'); // This ensures the container is visible and text is set
    estimatedInfoSection.hide(); // Hide estimated info section during actual download

    xhrDownload = $.ajax({
        url: '/download_ajax/',
        type: 'POST',
        data: {
            'url': url,
            'format_type': format_type,
            'quality': quality,
            'video_id': video_id,
            'csrfmiddlewaretoken': csrftoken
        },
        beforeSend: function(xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        },
        success: function(data) {
            stopProgressPolling(); // Stop polling
            stopProgressBar(); // Hide the separate bar and reset its text

            downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download'); // Reset button text
            cancelDownloadButton.fadeOut(300);

            if (data.status === 'success' && data.download_url && data.filename) {
                const downloadUrl = data.download_url;
                const filename = data.filename;
                const actualFileSize = data.file_size;

                console.log('Download AJAX successful. Received download URL:', downloadUrl);
                console.log('Suggested filename:', filename);
                console.log('Actual file size (bytes):', actualFileSize);

                // Trigger browser download AFTER server-side is complete
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    a.remove();
                }, 100);

                showMessage(`Download initiated successfully! (Size: ${formatBytes(actualFileSize)})`, 'success');

                // --- MODIFIED: Attach event listener to the dynamically created download link ---
                const downloadLinkHtml = `<p>If download did not start automatically, <a id="manualDownloadLink" href="${downloadUrl}" download="${filename}">click here</a>.</p>`;
                downloadLinkDiv.html(downloadLinkHtml).css('opacity', 0).fadeTo(300, 1);

                // Attach the click event listener to the new link
                $('#manualDownloadLink').off('click').on('click', function(e) {
                    e.preventDefault(); // Prevent default link behavior
                    const linkHref = $(this).attr('href');
                    const linkDownload = $(this).attr('download');

                    // Perform a HEAD request to check if the file exists
                    $.ajax({
                        url: linkHref,
                        type: 'HEAD', // Use HEAD method to check existence without downloading
                        success: function() {
                            // File exists, proceed with download
                            const tempA = document.createElement('a');
                            tempA.href = linkHref;
                            tempA.download = linkDownload;
                            document.body.appendChild(tempA);
                            tempA.click();
                            tempA.remove();
                            console.log("Manual download triggered successfully.");
                        },
                        error: function(xhr) {
                            // File does not exist or other error
                            console.error("Error checking file existence for manual download:", xhr.status, xhr.responseText);
                            if (xhr.status === 404) {
                                showMessage('Video not available. Paste link or Download again!', 'error');
                            } else {
                                showMessage('An error occurred while checking video availability. Please try again.', 'error');
                            }
                        }
                    });
                });
                // --- END MODIFIED SECTION ---

            } else {
                showMessage(data.message || 'Server did not return a valid download URL.', 'error');
            }
        },
        error: function(xhr, status, error) {
            stopProgressPolling();
            stopProgressBar(); // Hide the separate bar on error

            downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download'); // Reset button text
            cancelDownloadButton.fadeOut(300);

            let errorMessage = 'Download failed.';
            if (status === 'abort') {
                errorMessage = 'Download cancelled by user.';
            } else {
                try {
                    const errorJson = JSON.parse(xhr.responseText);
                    if (errorJson.message) {
                        errorMessage = 'Server Message: ' + errorJson.message;
                    } else if (errorJson.error) {
                        errorMessage = 'Server Error: ' + errorJson.error;
                    } else {
                        errorMessage = `Unexpected response. Status: ${xhr.status}. Error: ${error || xhr.statusText}.`;
                    }
                } catch (e) {
                    errorMessage = `An unexpected error occurred. Status: ${xhr.status}. Error: ${error || xhr.statusText}.`;
                    console.error("AJAX Error:", error, status, xhr);
                }
            }
            showMessage(errorMessage, 'error');
        }
    });
});

// Utility function to format bytes for display on frontend
function formatBytes(bytes) {
    if (bytes === undefined || bytes === null || bytes === 0) {
        return "0 Bytes";
    }
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 0) + ' ' + sizes[i];
}


// --- Progress Polling Logic (for the separate green bar) ---
function startProgressPolling(videoId) {
    if (progressPollingInterval) {
        clearInterval(progressPollingInterval);
    }

    downloadSizeInfo.fadeIn(300);
    etaDisplayContainer.fadeIn(300); // Show ETA container when polling starts
    estimatedInfoSection.hide(); // Hide the estimated info section during actual download
    downloadedBytesSpan.text('0 Bytes');
    totalBytesSpan.text('N/A');
    estimatedTimeDisplay.text('N/A'); // Reset ETA display

    // Ensure the separate progress bar container is visible
    loadingBarContainer.fadeIn(300);
    loadingBar.css('width', '0%'); // Start the bar from 0%

    progressPollingInterval = setInterval(() => {
        $.ajax({
            url: '/get_download_progress/',
            type: 'POST',
            data: JSON.stringify({
                video_id: videoId
            }),
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function(data) {
                if (data.status === 'downloading' || data.status === 'preparing' || data.status === 'starting') {
                    const progress = data.progress || 0;
                    loadingBar.css('width', `${progress}%`); // Update the separate green bar's width

                    const speedText = data.speed && data.speed !== 'N/A' ? `(${data.speed})` : '';
                    loadingText.text(`Downloading... ${progress.toFixed(0)}% ${speedText}`); // Show speed
                    downloadedBytesSpan.text(data.downloaded_bytes);
                    totalBytesSpan.text(data.total_bytes);
                    estimatedTimeDisplay.text(data.eta || 'N/A'); // Update ETA display
                } else if (data.status === 'finished') {
                    loadingBar.css('width', '100%'); // Fill the bar to 100%
                    loadingText.text('Download Complete!');
                    downloadedBytesSpan.text(data.downloaded_bytes);
                    totalBytesSpan.text(data.total_bytes);
                    estimatedTimeDisplay.text('0s'); // ETA to 0 when finished
                    stopProgressPolling();
                } else if (data.status === 'error') {
                    stopProgressPolling();
                    stopProgressBar(); // Hide the bar on error
                    showMessage(`Download failed: ${data.error_message || 'Unknown error.'}`, 'error');
                    downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download');
                    cancelDownloadButton.fadeOut(300);
                    downloadSizeInfo.fadeOut(300);
                    etaDisplayContainer.fadeOut(300); // Hide ETA on error
                }
            },
            error: function(xhr, status, error) {
                stopProgressPolling();
                stopProgressBar(); // Hide the bar on error
                let errorMessage = 'Error fetching download progress.';
                try {
                    const errorJson = JSON.parse(xhr.responseText);
                    errorMessage = 'Progress Error: ' + (errorJson.message || errorJson.error || 'Unknown.');
                } catch (e) {
                    errorMessage = `Network error fetching progress. Status: ${xhr.status}. Error: ${error || xhr.statusText}.`;
                }
                showMessage(errorMessage, 'error');
                console.error("AJAX Error during progress polling:", error, xhr.responseText, xhr.status);
                downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download');
                cancelDownloadButton.fadeOut(300);
                downloadSizeInfo.fadeOut(300);
                etaDisplayContainer.fadeOut(300); // Hide ETA on error
            }
        });
    }, 1000);
}

function stopProgressPolling() {
    if (progressPollingInterval) {
        clearInterval(progressPollingInterval);
        progressPollingInterval = null;
        console.log("Progress polling stopped.");
    }
}

// --- Cancel Button Logic ---
$('#cancelDownloadButton').click(function() {
    if (xhrDownload) {
        xhrDownload.abort();
        // Update tracker status to 'aborted'
        const video_id = videoIdInput.val();
        if (video_id) {
            $.ajax({
                url: '/update_download_status/', // New endpoint to update status
                type: 'POST',
                data: JSON.stringify({
                    video_id: video_id,
                    status: 'aborted'
                }),
                contentType: 'application/json',
                headers: {
                    'X-CSRFToken': csrftoken
                },
                success: function(response) {
                    console.log("Download status updated to aborted:", response);
                },
                error: function(xhr, status, error) {
                    console.error("Failed to update download status to aborted:", error);
                }
            });
        }

        stopProgressPolling();
        stopProgressBar(); // Hide the bar on cancel

        // Reset button to original state on cancel
        downloadButton.prop('disabled', false).html('<i class="fas fa-download"></i> Download');

        cancelDownloadButton.fadeOut(300);
        showMessage('Download process aborted.', 'info');
        xhrDownload = null;

        // After cancelling, show the estimated info section again if a URL is present and it's not a short
        const videoUrl = videoUrlInput.val().trim();
        if (videoUrl && !thumbnailContainer.data('is_short')) {
            estimatedInfoSection.fadeIn(300);
            updateEstimatedSizeDisplay(); // Re-display the size
        }
    }
});

// --- Scroll to Top on Page Load/Refresh ---
$(window).on('load', function() {
    setTimeout(function() {
        window.scrollTo(0, 0);
        console.log("main.js: Forced scroll to top on window load.");
    }, 0);
});

window.addEventListener('popstate', function() {
    window.scrollTo(0, 0);
});

// --- Function to get URL parameters (Crucial for extension integration) ---
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// --- Document Ready Handler (Crucial for extension integration and initial setup) ---
$(document).ready(function() {
    console.log("main.js: Document is ready. Initializing UI.");
    resetUIState();

    const params = new URLSearchParams(window.location.search);
    const ytUrl = params.get("videoUrl") || params.get("url"); // This line looks for 'videoUrl' or 'url'
    if (ytUrl) {
        if (videoUrlInput.length > 0) {
            videoUrlInput.val(ytUrl);
            console.log("main.js: Pre-filled #videoUrl input with:", videoUrlInput.val());
            fetchVideoDetails();
        } else {
            console.error("main.js: #videoUrl input element not found in the DOM.");
        }
    } else {
        console.log("main.js: No 'videoUrl' parameter found in URL.");
    }
});