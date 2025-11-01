// Guided Tours using Shepherd.js
import auth from '../auth.js';
import router from '../router.js';

const tourConfig = {
  useModalOverlay: true,
  defaultStepOptions: {
    classes: 'paypr-tour',
    scrollTo: { behavior: 'smooth', block: 'center' },
    cancelIcon: {
      enabled: true
    },
    modalOverlayOpeningPadding: 4,
    modalOverlayOpeningRadius: 8
  }
};

// Reader Tour - 10 steps
export function startReaderTour() {
  const tour = new Shepherd.Tour(tourConfig);
  
  tour.addStep({
    id: 'welcome',
    title: '👋 Welcome to Paypr!',
    text: `
      <p>Paypr lets you unlock premium articles with one-click micropayments.</p>
      <p>Let's take a quick tour to show you how it works!</p>
    `,
    buttons: [
      {
        text: 'Skip Tour',
        action: tour.complete,
        secondary: true
      },
      {
        text: 'Start Tour',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'newsstand',
    title: '📰 Browse Publishers',
    text: `
      <p>This is the newsstand—your homepage for discovering quality journalism.</p>
      <p>Browse publishers by category, search for specific topics, or scroll to explore.</p>
    `,
    attachTo: {
      element: '.publisher-card',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'click-publisher',
    title: '🔍 View Publisher Articles',
    text: `
      <p>Click on any publisher card to see their available articles.</p>
      <p>Each publisher sets their own prices and revenue splits.</p>
    `,
    attachTo: {
      element: '.publisher-card',
      on: 'right'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: () => {
          // Navigate to first publisher
          const publisherCard = document.querySelector('.publisher-card a');
          if (publisherCard) {
            publisherCard.click();
            setTimeout(() => tour.next(), 500);
          } else {
            tour.next();
          }
        }
      }
    ]
  });
  
  tour.addStep({
    id: 'login-prompt',
    title: '🔐 Login Required',
    text: `
      <p>To unlock articles, you'll need to log in.</p>
      <p>Just enter any email—no password needed! New users get $5 starter credit.</p>
    `,
    attachTo: {
      element: '.btn-primary',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'wallet-balance',
    title: '💰 Your Wallet',
    text: `
      <p>Your wallet balance is always visible in the navbar.</p>
      <p>New accounts start with $5. You can add more funds anytime.</p>
    `,
    attachTo: {
      element: '.wallet-badge',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ],
    when: {
      show: () => {
        if (!auth.isAuthenticated) {
          // Skip this step if not logged in
          tour.next();
        }
      }
    }
  });
  
  tour.addStep({
    id: 'select-article',
    title: '📄 Choose an Article',
    text: `
      <p>Click on any article to see a preview and unlock option.</p>
      <p>Prices typically range from $0.49 to $2.99 per article.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'payment-button',
    title: '🔓 One-Click Unlock',
    text: `
      <p>Click the "Unlock Article" button to pay and get instant access.</p>
      <p>Payment is deducted from your wallet instantly—no credit card required.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'refund-window',
    title: '⏰ 10-Minute Refund Window',
    text: `
      <p>Changed your mind? You have 10 minutes to request a full refund.</p>
      <p>This gives you risk-free reading—try before you commit!</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'transaction-history',
    title: '📊 Transaction History',
    text: `
      <p>View all your purchases in the History page.</p>
      <p>You'll see detailed revenue splits showing where your money goes.</p>
    `,
    attachTo: {
      element: 'a[href="#/history"]',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ],
    when: {
      show: () => {
        if (!auth.isAuthenticated) {
          tour.next();
        }
      }
    }
  });
  
  tour.addStep({
    id: 'tour-complete',
    title: '🎉 You\'re All Set!',
    text: `
      <p>You now know how to discover and unlock premium content on Paypr.</p>
      <p>Start exploring and support quality journalism!</p>
    `,
    buttons: [
      {
        text: 'Finish Tour',
        action: () => {
          markTourComplete('reader');
          tour.complete();
        }
      }
    ]
  });
  
  tour.start();
  return tour;
}

// Author Tour - 11 steps  
export function startAuthorTour() {
  const tour = new Shepherd.Tour(tourConfig);
  
  tour.addStep({
    id: 'welcome',
    title: '✍️ Welcome Authors!',
    text: `
      <p>Paypr lets you publish articles, set your own prices, and earn 60-90% revenue.</p>
      <p>Let's show you how the author platform works!</p>
    `,
    buttons: [
      {
        text: 'Skip Tour',
        action: tour.complete,
        secondary: true
      },
      {
        text: 'Start Tour',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'create-profile',
    title: '👤 Create Author Profile',
    text: `
      <p>First, you'll need to create your author profile.</p>
      <p>Add your bio, photo, and default article pricing.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: () => {
          router.navigate('/author/dashboard');
          setTimeout(() => tour.next(), 500);
        }
      }
    ]
  });
  
  tour.addStep({
    id: 'author-dashboard',
    title: '📊 Author Dashboard',
    text: `
      <p>This is your earnings command center!</p>
      <p>See total earnings, recent sales, and track performance of each article.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'earnings-stats',
    title: '💰 Track Your Earnings',
    text: `
      <p>View your earnings over time with visual charts.</p>
      <p>See which articles perform best and earn the most revenue.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'new-article-button',
    title: '📝 Submit New Article',
    text: `
      <p>Click "New Article" to start creating content.</p>
      <p>You control everything: title, content, price, and publishing model.</p>
    `,
    attachTo: {
      element: 'a[href="#/author/submit"]',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: () => {
          router.navigate('/author/submit');
          setTimeout(() => tour.next(), 500);
        }
      }
    ]
  });
  
  tour.addStep({
    id: 'submission-form',
    title: '✏️ Content Creation',
    text: `
      <p>Write your article using the submission form.</p>
      <p>Add a compelling title, description, and your full content.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'pricing-options',
    title: '💵 Set Your Price',
    text: `
      <p>You decide what your work is worth!</p>
      <p>Common prices range from $0.99 to $4.99, but you have full control.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'license-types',
    title: '📄 Choose Publishing Model',
    text: `
      <p><strong>Independent (90% revenue):</strong> Publish on your own, keep most earnings</p>
      <p><strong>Revenue Share (60% revenue):</strong> Partner with a publisher for distribution</p>
      <p>You can also negotiate custom splits!</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'published-content',
    title: '📚 Manage Your Content',
    text: `
      <p>View all your published articles in one place.</p>
      <p>Track sales, edit content, or unpublish anytime.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'earnings-per-article',
    title: '📈 Per-Article Performance',
    text: `
      <p>See exactly how much each article has earned.</p>
      <p>Understand what resonates with readers and optimize accordingly.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'tour-complete',
    title: '🎊 Start Creating!',
    text: `
      <p>You're ready to publish and earn on Paypr!</p>
      <p>Create your profile, submit your first article, and start making money from your writing.</p>
    `,
    buttons: [
      {
        text: 'Finish Tour',
        action: () => {
          markTourComplete('author');
          tour.complete();
        }
      }
    ]
  });
  
  tour.start();
  return tour;
}

// Publisher Tour - 10 steps
export function startPublisherTour() {
  const tour = new Shepherd.Tour(tourConfig);
  
  tour.addStep({
    id: 'welcome',
    title: '📰 Welcome Publishers!',
    text: `
      <p>Paypr lets you curate content from independent authors without hiring them as employees.</p>
      <p>Let's explore the publisher console!</p>
    `,
    buttons: [
      {
        text: 'Skip Tour',
        action: tour.complete,
        secondary: true
      },
      {
        text: 'Start Tour',
        action: () => {
          router.navigate('/publisher/console');
          setTimeout(() => tour.next(), 500);
        }
      }
    ]
  });
  
  tour.addStep({
    id: 'console-overview',
    title: '🎛️ Publisher Console',
    text: `
      <p>This is your publisher dashboard with revenue analytics and performance metrics.</p>
      <p>Track all-time and 7-day revenue, article performance, and more.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'revenue-analytics',
    title: '📊 Revenue Analytics',
    text: `
      <p>View detailed revenue charts and statistics.</p>
      <p>See trends over time and identify your best-performing content.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'content-management',
    title: '📝 Manage Content',
    text: `
      <p>Navigate to Content Management to curate articles.</p>
      <p>See your published articles and browse available author submissions.</p>
    `,
    attachTo: {
      element: 'button[onclick*="publisher/content"]',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: () => {
          router.navigate('/publisher/content');
          setTimeout(() => tour.next(), 500);
        }
      }
    ]
  });
  
  tour.addStep({
    id: 'available-content-tab',
    title: '🔍 Browse Author Content',
    text: `
      <p>Switch to the "Available from Authors" tab to see submissions.</p>
      <p>Authors publish independently, and you can add their work to your catalog.</p>
    `,
    attachTo: {
      element: '.content-tab[data-tab="available"]',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'preview-submission',
    title: '👁️ Preview Articles',
    text: `
      <p>Click "Preview" to read any author's article before adding it.</p>
      <p>Make sure it fits your publication's standards and audience.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'add-to-catalog',
    title: '➕ Add to Your Catalog',
    text: `
      <p>Click "Add to Catalog" to publish an author's work under your brand.</p>
      <p>You'll negotiate revenue splits with the author.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'configure-splits',
    title: '💸 Configure Revenue Splits',
    text: `
      <p>Set custom revenue splits for each article.</p>
      <p>Typical splits: 60% author, 30% publisher, 10% platform.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: () => {
          router.navigate('/publisher/authors');
          setTimeout(() => tour.next(), 500);
        }
      }
    ]
  });
  
  tour.addStep({
    id: 'author-relationships',
    title: '👥 Manage Authors',
    text: `
      <p>View all authors who've contributed to your publication.</p>
      <p>Track their earnings, article count, and revenue split percentages.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Next',
        action: tour.next
      }
    ]
  });
  
  tour.addStep({
    id: 'export-data',
    title: '📥 Export Transaction Data',
    text: `
      <p>Download CSV reports of all transactions.</p>
      <p>Use this for accounting, tax reporting, or detailed analysis.</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        secondary: true
      },
      {
        text: 'Finish Tour',
        action: () => {
          markTourComplete('publisher');
          tour.complete();
        }
      }
    ]
  });
  
  tour.start();
  return tour;
}

// Helper functions
function markTourComplete(tourType) {
  const completed = getTourCompletionStatus();
  completed[tourType] = true;
  localStorage.setItem('paypr_tours_completed', JSON.stringify(completed));
}

function getTourCompletionStatus() {
  try {
    const stored = localStorage.getItem('paypr_tours_completed');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export function hasTourCompleted(tourType) {
  const completed = getTourCompletionStatus();
  return completed[tourType] === true;
}

export function resetAllTours() {
  localStorage.removeItem('paypr_tours_completed');
}

export default {
  startReaderTour,
  startAuthorTour,
  startPublisherTour,
  hasTourCompleted,
  resetAllTours
};

