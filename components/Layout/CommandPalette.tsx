'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCommandPalette } from '@/hooks/useCommandPalette';

import { CommandPaletteActions } from './CommandPaletteActions';
import { CommandPaletteResults } from './CommandPaletteResults';
import { CommandPaletteSearch } from './CommandPaletteSearch';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    nlAnswer,
    isNlQuery,
    scrollAreaRef,
    recentItems,
    openSections,
    toggleSection,
    filteredSections,
    flatResults,
    hasSearchResults,
    groupedEntityTypes,
    handleNavigation,
    handleEntityNavigation,
    pathname,
  } = useCommandPalette(isOpen, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-lg font-semibold">Command Palette</DialogTitle>
          <DialogDescription className="sr-only">Search commands and navigate</DialogDescription>
        </DialogHeader>

        <CommandPaletteSearch
          searchQuery={searchQuery}
          isSearching={isSearching}
          onSearchChange={setSearchQuery}
          onIndexReset={() => setSelectedIndex(0)}
        />

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4" ref={scrollAreaRef}>
            <CommandPaletteResults
              searchQuery={searchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              isNlQuery={isNlQuery}
              nlAnswer={nlAnswer}
              hasSearchResults={hasSearchResults}
              groupedEntityTypes={groupedEntityTypes}
              selectedIndex={selectedIndex}
              onEntityNavigate={handleEntityNavigation}
            />
            <CommandPaletteActions
              searchQuery={searchQuery}
              recentItems={recentItems}
              filteredSections={filteredSections}
              flatResults={flatResults}
              selectedIndex={selectedIndex}
              openSections={openSections}
              pathname={pathname}
              onNavigate={handleNavigation}
              onToggleSection={toggleSection}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
