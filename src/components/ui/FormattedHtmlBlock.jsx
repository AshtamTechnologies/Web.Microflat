import React, { useMemo } from 'react';
import { decodeHtmlString, isHtmlMarkup, isVisuallyEmptyHtml } from '../../utils/htmlUtils';

/**
 * FormattedHtmlBlock
 * Safely renders rich text / HTML content without exposing raw tags (<p>, <span>, <ul>, etc.)
 * Provides clean typography styling for lists (ul/ol/li), paragraphs, headings,
 * inline styles (colors, fonts), underlines, bold, italics, etc.
 *
 * If content is plain text or empty, renders clean fallback typography.
 */
export default function FormattedHtmlBlock({
  content,
  emptyText = 'None specified.',
  className = '',
  inline = false,
}) {
  const decoded = useMemo(() => decodeHtmlString(content), [content]);

  if (!decoded || isVisuallyEmptyHtml(decoded)) {
    return <span className="text-text-muted italic">{emptyText}</span>;
  }

  const hasTags = isHtmlMarkup(decoded);

  if (hasTags) {
    const Tag = inline ? 'span' : 'div';
    return (
      <Tag
        className={`text-xs text-text leading-relaxed max-w-none prose prose-xs break-words
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5
          [&_li]:my-0.5 [&_li]:leading-relaxed
          [&_li_p]:inline [&_li_p]:my-0
          [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
          [&_strong]:font-semibold [&_strong]:text-heading
          [&_em]:italic
          [&_u]:underline
          [&_s]:line-through [&_del]:line-through
          [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary-hover
          [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-muted
          ${className}`}
        dangerouslySetInnerHTML={{ __html: decoded }}
      />
    );
  }

  return (
    <p className={`text-xs text-text whitespace-pre-line leading-relaxed break-words ${className}`}>
      {decoded}
    </p>
  );
}
