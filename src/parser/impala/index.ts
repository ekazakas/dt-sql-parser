import { CandidatesCollection } from 'antlr4-c3';
import { CharStream, CommonTokenStream, Token } from 'antlr4ng';

import { ImpalaSqlLexer } from '../../lib/impala/ImpalaSqlLexer';
import { ImpalaSqlParser, ProgramContext } from '../../lib/impala/ImpalaSqlParser';
import { BasicSQL } from '../common/basicSQL';
import { StmtContextType } from '../common/entityCollector';
import { ErrorListener } from '../common/parseErrorListener';
import { EntityContextType, Suggestions, SyntaxSuggestion } from '../common/types';
import { ImpalaEntityCollector } from './impalaEntityCollector';
import { ImpalaErrorListener } from './ImpalaErrorListener';
import { ImpalaSqlSplitListener } from './impalaSplitListener';

export { ImpalaEntityCollector, ImpalaSqlSplitListener };

export class ImpalaSQL extends BasicSQL<ImpalaSqlLexer, ProgramContext, ImpalaSqlParser> {
    protected createLexerFromCharStream(charStreams: CharStream) {
        return new ImpalaSqlLexer(charStreams);
    }

    protected createParserFromTokenStream(tokenStream: CommonTokenStream) {
        return new ImpalaSqlParser(tokenStream);
    }

    protected preferredRules: Set<number> = new Set([
        ImpalaSqlParser.RULE_functionNameCreate,
        ImpalaSqlParser.RULE_tableNameCreate,
        ImpalaSqlParser.RULE_viewNameCreate,
        ImpalaSqlParser.RULE_databaseNameCreate,
        ImpalaSqlParser.RULE_columnNamePathCreate,
        ImpalaSqlParser.RULE_tableNamePath,
        ImpalaSqlParser.RULE_functionNamePath,
        ImpalaSqlParser.RULE_viewNamePath,
        ImpalaSqlParser.RULE_databaseNamePath,
        ImpalaSqlParser.RULE_columnNamePath,
    ]);

    protected get splitListener() {
        return new ImpalaSqlSplitListener();
    }

    protected createErrorListener(_errorListener: ErrorListener): ImpalaErrorListener {
        const parserContext = this;
        return new ImpalaErrorListener(_errorListener, parserContext, this.preferredRules);
    }
    protected createEntityCollector(input: string, allTokens?: Token[], caretTokenIndex?: number) {
        return new ImpalaEntityCollector(input, allTokens, caretTokenIndex);
    }

    protected processCandidates(
        candidates: CandidatesCollection,
        allTokens: Token[],
        caretTokenIndex: number,
        tokenIndexOffset: number
    ): Suggestions<Token> {
        const originalSyntaxSuggestions: SyntaxSuggestion<Token>[] = [];
        const keywords: string[] = [];
        for (let candidate of candidates.rules) {
            const [ruleType, candidateRule] = candidate;
            const startTokenIndex = candidateRule.startTokenIndex + tokenIndexOffset;
            const tokenRanges = allTokens.slice(
                startTokenIndex,
                caretTokenIndex + tokenIndexOffset + 1
            );

            let syntaxContextType: EntityContextType | StmtContextType | undefined = void 0;
            switch (ruleType) {
                case ImpalaSqlParser.RULE_functionNameCreate: {
                    syntaxContextType = EntityContextType.FUNCTION_CREATE;
                    break;
                }
                case ImpalaSqlParser.RULE_tableNameCreate: {
                    syntaxContextType = EntityContextType.TABLE_CREATE;
                    break;
                }
                case ImpalaSqlParser.RULE_databaseNameCreate: {
                    syntaxContextType = EntityContextType.DATABASE_CREATE;
                    break;
                }
                case ImpalaSqlParser.RULE_viewNameCreate: {
                    syntaxContextType = EntityContextType.VIEW_CREATE;
                    break;
                }
                case ImpalaSqlParser.RULE_columnNamePathCreate: {
                    syntaxContextType = EntityContextType.COLUMN_CREATE;
                    break;
                }
                case ImpalaSqlParser.RULE_databaseNamePath: {
                    syntaxContextType = EntityContextType.DATABASE;
                    break;
                }
                case ImpalaSqlParser.RULE_tableNamePath: {
                    syntaxContextType = EntityContextType.TABLE;
                    break;
                }
                case ImpalaSqlParser.RULE_viewNamePath: {
                    syntaxContextType = EntityContextType.VIEW;
                    break;
                }
                case ImpalaSqlParser.RULE_functionNamePath: {
                    syntaxContextType = EntityContextType.FUNCTION;
                    break;
                }
                case ImpalaSqlParser.RULE_columnNamePath: {
                    syntaxContextType = EntityContextType.COLUMN;
                }
                default:
                    break;
            }

            if (syntaxContextType) {
                originalSyntaxSuggestions.push({
                    syntaxContextType,
                    wordRanges: tokenRanges,
                });
            }
        }

        for (let candidate of candidates.tokens) {
            const symbolicName = this._parser.vocabulary.getSymbolicName(candidate[0]);
            const displayName = this._parser.vocabulary.getDisplayName(candidate[0]);
            if (displayName && symbolicName && symbolicName.startsWith('KW_')) {
                const keyword =
                    displayName.startsWith("'") && displayName.endsWith("'")
                        ? displayName.slice(1, -1)
                        : displayName;
                keywords.push(keyword);
            }
        }
        return {
            syntax: originalSyntaxSuggestions,
            keywords,
        };
    }
}
