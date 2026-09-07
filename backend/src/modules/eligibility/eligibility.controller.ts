import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { EvaluateEligibilityDto } from './dto/evaluate-eligibility.dto';
import { EligibilityService } from './eligibility.service';

@ApiTags('eligibility')
@Controller('eligibility')
@ApiBearerAuth()
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get('rules')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'List all eligibility rules' })
  async findAll() {
    return this.eligibilityService.findAll();
  }

  @Get('rules/:id')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'Get rule by ID' })
  async findOne(@Param('id') id: string) {
    return this.eligibilityService.findById(id);
  }

  @Post('rules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create eligibility rule' })
  async create(@Body() data: { name: string; key: string; ruleType: string; operator: string; value: unknown; description?: string }) {
    return this.eligibilityService.create(data);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate the authenticated customer against a loan product' })
  async evaluate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: EvaluateEligibilityDto,
  ) {
    return this.eligibilityService.evaluate(user.id, dto.loanProductId);
  }

  @Get('evaluations/my')
  @ApiOperation({ summary: 'Get my evaluation results' })
  async myEvaluations(@CurrentUser() user: CurrentUserPayload) {
    return this.eligibilityService.findEvaluations(user.id);
  }
}
