<?php if (!defined('TL_ROOT')) die('You can not access this file directly!');

/**
 * Contao Open Source CMS
 * Copyright (C) 2005-2010 Leo Feyer
 *
 * Formerly known as TYPOlight Open Source CMS.
 *
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program. If not, please visit the Free
 * Software Foundation website at <http://www.gnu.org/licenses/>.
 *
 * PHP version 5
 * @copyright  Andreas Schempp 2009-2010
 * @author     Andreas Schempp <andreas@schempp.ch>
 * @license    http://opensource.org/licenses/lgpl-3.0.html
 * @version    $Id$
 */
 
 
class FastEdit extends Backend
{

	public function parseTemplate($strBuffer, $strTemplate)
	{
		if (TL_MODE == 'BE' || !$_SESSION['BE_DATA']['fastedit'])
		{
			// Unset hook to prevent pointless hook calls (on each template parse)
			unset($GLOBALS['TL_HOOKS']['parseTemplate']['fastedit']);
            return $strBuffer;
		}
		else if(substr($strTemplate, 0, 3) == 'fe_' || substr($strTemplate, 0, 3) == 'df_' || substr($strTemplate, 0, 3) == 'moo_')
		{
			return $strBuffer;
		}
		
		$this->import('BackendUser', 'User');
		$this->User->authenticate();
		$this->User->id = '';

        $backtrace = debug_backtrace();
        foreach( $backtrace as $step )
        {
        	if ($strTemplate == 'form')
        	{
        		if ($step['class'] != 'Form')
        			continue;
        			
        		$do = 'form&act=edit';
        		$id = $step['object']->id;
        	}
        	elseif ($step['function'] == 'generate' && $step['class'] == 'ModuleArticle')
        	{
        		// Teaser
        		if($step['object']->showTeaser && $step['object']->multiMode)
        		{
        			if (!$this->User->hasAccess('article', 'modules'))
            			return $strBuffer;
            				
        			$do = 'article&table=tl_article&act=edit';
        			$id = $step['object']->id;
        		}
        	}
			elseif ($step['class'] == 'FrontendTemplate' && substr($strTemplate, 0, 5) == 'news_')
        	{
				preg_match('@items/((.)*)\.html@', $step['object']->link, $arrMatches);
				
				$objNews = $this->Database->prepare("SELECT id FROM tl_news WHERE alias=?")
										  ->execute($arrMatches[1]);
							   
				if ($objNews->numRows)
				{
					if (!$this->User->hasAccess('news', 'modules'))
            			return $strBuffer;
            				
					$do = 'news&table=tl_news&act=edit';
					$id = $objNews->id;
				}
        	}
            elseif ($step['function'] == 'generate')
            {
                $class = $step['class'];
                foreach( $GLOBALS['FE_MOD'] as $modules )
                {
                    $key = array_search($class, $modules);
                    if ($key !== false)
                    {
                    	if (!$this->User->hasAccess('modules', 'modules'))
            				return $strBuffer;
            		
                        $do = (version_compare(VERSION, '2.9', '<') ? 'modules&act=edit' : 'themes&table=tl_module&act=edit');
                        $id = $step['object']->id;
                        break;
                    }
                }
            }
            else if ($step['function'] == 'getContentElement')
            {
            	if (!$this->User->hasAccess('article', 'modules'))
            		return $strBuffer;
            		
                $do = 'article&table=tl_content&act=edit';
                $id = $step['args'][0];
            }
            
            if (strlen($do))
            	break;
        }
        
        if (!strlen($do) || !strlen($id))
            return $strBuffer;
            
        // Add mediabox style sheet
		$GLOBALS['TL_CSS']['fastedit_mediabox'] = 'system/modules/fastedit/html/fastedit.css|screen';
		$GLOBALS['TL_MOOTOOLS']['fastedit_mediabox'] = '
<script type="text/javascript" src="system/modules/fastedit/html/fastedit.js"></script>';

        return '<div onmouseover="this.style.background=\'#EBFDD7\'; this.firstChild.style.visibility=\'visible\'" onmouseout="this.style.background=\'transparent\'; this.firstChild.style.visibility=\'hidden\'"><div style="position: absolute; border: 1px solid #FF0000; background-color: #FFFFFF; z-index:998; padding: 2px; padding-top: 4px; visibility: hidden"><a href="' . (version_compare(VERSION, '2.8', '>') ? 'contao' : 'typolight') . '/main.php?do='.$do.'&id='.$id.'" rel="fastedit"><img src="system/themes/default/images/edit.gif" alt="" /></a></div>'.$strBuffer.'</div>';
	}
	
	public function saveUserId($strBuffer, $strTemplate)
	{
		$this->import('BackendUser', 'User');
		$this->Session->set('fastedit', $this->User->fastedit);
		
		return $strBuffer;
	}
}
 
